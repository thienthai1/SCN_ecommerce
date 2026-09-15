const { randomUUID } = require('node:crypto');
const { CronExpressionParser } = require('cron-parser');

// One backend worker per database. Pending jobs survive stop/restart; overdue
// one-time jobs run on the next startup. External push delivery is at least once.
module.exports = function registerLocalScheduler(app, opts) {
  const { db, Timestamp, authenticate, ensureAdmin, sendPushNotificationToAll } = opts;
  const jobs = db.collection('scheduled_jobs');
  // Keep the historical spelling as an API alias for existing clients.
  const prefixes = ['/scheduler', '/clould-scheduler'];
  let busy = false;
  let closed = false;
  let active = Promise.resolve();
  const nextCron = (schedule, timeZone, now) => CronExpressionParser.parse(schedule, {
    currentDate: new Date(now), tz: timeZone,
  }).next().toDate().getTime();

  const expose = (id, job) => ({
    name: `local/jobs/${id}`, schedule: job.schedule || '', timeZone: job.timeZone,
    state: job.state === 'pending' ? 'ENABLED' : job.state.toUpperCase(),
    httpTarget: { body: { title: job.title, description: job.description,
      _meta: { jobId: id, runAt: new Date(job.nextRun).toISOString(), oneTime: !job.schedule } } },
  });
  async function create(body) {
    const { title, description, runAt, schedule, timeZone = 'UTC' } = body;
    if (!title || !description || (!runAt && !schedule)) throw new Error('title, description and runAt or schedule are required');
    new Intl.DateTimeFormat('en', { timeZone }); // Reject invalid IANA timezones.
    const nextRun = runAt ? new Date(runAt).getTime() : nextCron(schedule, timeZone, Date.now());
    if (!Number.isFinite(nextRun) || nextRun <= Date.now()) throw new Error('runAt must be a valid future datetime');
    const baseId = String(body.jobId || 'notification').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100);
    let id = baseId;
    if ((await jobs.doc(id).get()).exists) id = `${baseId}-${randomUUID()}`;
    const job = { title, description, openUrl: body.openUrl || '/',
      nextRun, schedule: runAt ? null : schedule, timeZone, state: 'pending',
      createdAt: Timestamp.now() };
    await jobs.doc(id).set(job);
    return { id, job };
  }
  async function cancel(id) {
    const ref = jobs.doc(id);
    return db.atomic(() => {
      const job = db.read('scheduled_jobs', id);
      if (!job || job.state !== 'pending') return false;
      db.write(ref, { state: 'cancelled' }, 'update');
      return true;
    });
  }
  const recover = db.sql.prepare("SELECT id FROM documents WHERE collection = 'scheduled_jobs' AND json_extract(data, '$.state') = 'running'").all();
  db.atomic(() => recover.forEach(({ id }) => db.write(jobs.doc(id), { state: 'pending' }, 'update')));

  async function tick() {
    if (closed || busy) return;
    busy = true;
    try {
      const due = await jobs.where('state', '==', 'pending').where('nextRun', '<=', Date.now()).get();
      for (const doc of due.docs) {
        if (closed) break;
        const job = db.atomic(() => {
          const current = db.read('scheduled_jobs', doc.id);
          if (!current || current.state !== 'pending') return null;
          db.write(doc.ref, { state: 'running' }, 'update');
          return current;
        });
        if (!job) continue;
        try {
          const notification = db.collection('notifications').doc(`${doc.id}-${job.nextRun}`);
          await notification.set({ title: job.title, description: job.description, date: Timestamp.now() });
          await sendPushNotificationToAll(job.title, job.description, job.openUrl);
          await doc.ref.update(job.schedule
            ? { state: 'pending', nextRun: nextCron(job.schedule, job.timeZone, Date.now()), lastRun: Timestamp.now() }
            : { state: 'completed', completedAt: Timestamp.now() });
        } catch (error) {
          await doc.ref.update({ state: 'failed', error: error.message });
          console.error('Scheduled notification failed:', doc.id, error.message);
        }
      }
    } finally { busy = false; }
  }
  const timer = setInterval(() => {
    active = tick().catch(error => console.error('Local scheduler:', error.message));
  }, 1000);
  timer.unref();

  for (const prefix of prefixes) {
    app.post(`${prefix}/create-job`, authenticate, ensureAdmin, async (req, res) => {
      try {
        const { id, job } = await create(req.body);
        res.json({ message: 'Job created', assignedJobId: id, job: expose(id, job) });
      } catch (error) { res.status(400).json({ error: error.message }); }
    });
    app.get(`${prefix}/jobs`, authenticate, ensureAdmin, async (req, res) => {
      const snapshot = await jobs.where('state', 'in', ['pending', 'running']).orderBy('nextRun').get();
      res.json({ jobs: snapshot.docs.map(doc => expose(doc.id, doc.data())) });
    });
    app.delete(`${prefix}/delete-job/:jobId`, authenticate, ensureAdmin, async (req, res) => {
      if (!await cancel(req.params.jobId)) return res.status(404).json({ error: 'Pending job not found' });
      res.json({ message: 'Job cancelled' });
    });
  }
  // Older notification endpoints share the same durable queue.
  app.post('/schedule-notification', authenticate, ensureAdmin, async (req, res) => {
    try {
      const { id, job } = await create({ ...req.body, description: req.body.body, runAt: req.body.scheduledTime });
      res.json({ message: 'Notification scheduled', jobId: id, scheduledFor: new Date(job.nextRun).toISOString(), delayMs: job.nextRun - Date.now() });
    } catch (error) { res.status(400).json({ error: error.message }); }
  });
  app.get('/pending-notifications', authenticate, ensureAdmin, async (req, res) => {
    const snapshot = await jobs.where('state', '==', 'pending').orderBy('nextRun').get();
    const notifications = snapshot.docs.map(doc => {
      const job = doc.data();
      return { jobId: doc.id, title: job.title, body: job.description, openUrl: job.openUrl,
        scheduledFor: new Date(job.nextRun).toISOString(), createdAt: job.createdAt.toDate().toISOString() };
    });
    res.json({ count: notifications.length, notifications });
  });
  app.delete('/pending-notifications/:jobId', authenticate, ensureAdmin, async (req, res) => {
    if (!await cancel(req.params.jobId)) return res.status(404).json({ error: 'Pending job not found' });
    res.json({ message: 'Notification cancelled', jobId: req.params.jobId });
  });
  app.delete('/pending-notifications', authenticate, ensureAdmin, async (req, res) => {
    const snapshot = await jobs.where('state', '==', 'pending').get();
    let removedCount = 0;
    for (const doc of snapshot.docs) if (await cancel(doc.id)) removedCount++;
    res.json({ removedCount });
  });
  return { tick, close: async () => { closed = true; clearInterval(timer); await active; } };
};
