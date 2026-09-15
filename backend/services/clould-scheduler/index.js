require('dotenv').config();
const { CloudSchedulerClient } = require('@google-cloud/scheduler');

// Initialize the Scheduler client. It will pick up credentials from
// the environment variable GOOGLE_APPLICATION_CREDENTIALS if set.
const client = new CloudSchedulerClient();

const DEFAULT_PROJECT = process.env.GCP_PROJECT || 'gen-lang-client-0513522335';
const DEFAULT_LOCATION = process.env.GCP_LOCATION || 'us-central1';
const CLOUD_SCHEDULER_SECRET = process.env.CLOUD_SCHEDULER_SECRET;

if (!CLOUD_SCHEDULER_SECRET) {
  throw new Error('CLOUD_SCHEDULER_SECRET environment variable is required');
}

// Export a function that registers routes on an existing Express `app`.
// This keeps the backend running on the main port (e.g., 3000) and avoids
// starting a separate server.
module.exports = function registerCloudSchedulerRoutes(app, opts = {}) {
  const prefix = opts.prefix || '/clould-scheduler';
  const authenticate = opts.authenticate;
  const ensureAdmin = opts.ensureAdmin;

  if (!authenticate || !ensureAdmin) {
    throw new Error('registerCloudSchedulerRoutes requires authenticate and ensureAdmin in opts');
  }

  // Endpoint Cloud Scheduler can call to trigger and allow us to cleanup one-time jobs
  app.post(`${prefix}/trigger`, async (req, res) => {
    try {
      console.log('Cloud Scheduler trigger received:', {
        headers: req.headers,
        body: req.body,
        query: req.query
      });

      // Check the secret header
      const secretHeader = req.headers['x-cloud-scheduler-secret'];
      if (!secretHeader || secretHeader !== CLOUD_SCHEDULER_SECRET) {
        return res.status(401).json({ error: 'Unauthorized: Invalid secret' });
      }

      try {
        const meta = req.body && req.body._meta;
        const title = req.body && (req.body.title || req.body.name || (req.body.message && req.body.message.title));
        const description = req.body && (req.body.description || req.body.body || (req.body.message && req.body.message.body));

        // Create notification in Firestore and send push to all users
        if (!title || !description) {
          return res.status(400).json({ error: 'title and description are required' });
        }

        // Ensure we have DB and helpers injected via opts
        const db = opts.db;
        const Timestamp = opts.Timestamp;
        const sendPush = opts.sendPushNotificationToAll;

        if (!db || !Timestamp || !sendPush) {
          console.error('Trigger missing required dependencies (db/Timestamp/sendPushNotificationToAll)');
          return res.status(500).json({ error: 'Server not configured to create notifications' });
        }

        const newNotification = {
          title,
          description,
          date: Timestamp.now()
        };

        const docRef = await db.collection('notifications').add(newNotification);

        // Send push notification to all users
        await sendPush(title, description, '/#/');

        // If job metadata present, delete the one-time job
        if (meta && meta.jobId) {
          const pj = meta.projectId || DEFAULT_PROJECT;
          const lz = meta.locationId || DEFAULT_LOCATION;
          const jobName = client.jobPath(pj, lz, meta.jobId);
          try {
            await client.deleteJob({ name: jobName });
            console.log(`Deleted one-time job after creating notification: ${jobName}`);
          } catch (delErr) {
            console.error('Failed to delete one-time job after creating notification:', delErr && delErr.message ? delErr.message : delErr);
          }
        }

        return res.status(201).json({
          message: 'Notification created',
          id: docRef.id,
          ...newNotification,
          date: 'Just now'
        });
      } catch (innerErr) {
        console.error('Error creating notification in trigger:', innerErr);
        return res.status(500).json({ error: 'Failed to create notification' });
      }
    } catch (err) {
      console.error('Trigger handler error:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post(`${prefix}/create-job`, authenticate, ensureAdmin, async (req, res) => {
    try {
      const {
        jobId,
        schedule,
        title,
        description,
        projectId = DEFAULT_PROJECT,
        locationId = DEFAULT_LOCATION,
      } = req.body;

      // Allow providing a default notifications base URL via opts or env
      const defaultNotificationsBase = process.env.NOTIFICATIONS_URL;

      if (!jobId || (!schedule && !req.body.runAt)) {
        return res.status(400).json({ error: 'Missing required fields: jobId and schedule or runAt' });
      }

      let finalTarget = defaultNotificationsBase + `${prefix}` + '/trigger';

      // Build the full parent path for the location
      const parent = client.locationPath(projectId, locationId);

      // Payload that will be POSTed to the target when the job runs
      const payloadBase = {
        title: title || null,
        description: description || null,
        _meta: { triggeredBy: 'cloud-scheduler' },
      };

      // Support `runAt` ISO datetimes (one-time jobs). If provided, convert
      // to a UTC-based cron schedule and mark the job as one-time. The
      // incoming `runAt` should be an ISO string; including a timezone
      // offset (e.g. 2026-01-28T15:30:00+07:00) is recommended so conversion
      // is unambiguous. The created job will use UTC time for scheduling.
      let isOneTime = false;
      if (req.body.runAt) {
        const dt = new Date(req.body.runAt);
        if (Number.isNaN(dt.getTime())) {
          return res.status(400).json({ error: 'Invalid runAt datetime. Use ISO format, e.g. 2026-01-28T15:30:00+07:00' });
        }
        // Convert to UTC components and build a cron expression that
        // triggers at that exact minute (in UTC). Note: cron will repeat
        // in subsequent years/months unless we delete the job after it
        // fires. We mark it one-time and will delete it in the trigger
        // handler if the trigger endpoint used is this service.
        const minute = dt.getUTCMinutes();
        const hour = dt.getUTCHours();
        const day = dt.getUTCDate();
        const month = dt.getUTCMonth() + 1;
        // cron: "MIN HOUR DAY MONTH *"
        req.body.schedule = `${minute} ${hour} ${day} ${month} *`;
        // Set schedule timezone to UTC because we constructed cron from UTC
        req.body.timeZone = 'UTC';
        isOneTime = true;
        // propagate back into variables used below
      }

      // Ensure jobId uniqueness. If the requested jobId already exists,
      // append a short unique suffix. Try a few times before failing.
      const sanitize = (s) => String(s).replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
      const baseId = sanitize(jobId);
      let finalJobId = baseId;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const jobName = client.jobPath(projectId, locationId, finalJobId);
        try {
          // If job exists, getJob will succeed — so we need a new id.
          // If it throws a NotFound error, proceed to create the job.
          await client.getJob({ name: jobName });
          // job exists, generate new candidate id
          const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
          finalJobId = `${baseId}-${suffix}`;
          attempts += 1;
        } catch (err) {
          const notFound = err && (err.code === 5 || /not ?found/i.test(err.message || ''));
          if (notFound) {
            // available
            break;
          }
          // unknown error while checking — abort
          throw err;
        }
      }

      if (attempts >= maxAttempts) {
        return res.status(500).json({ error: 'Unable to generate a unique jobId after several attempts' });
      }

      // Determine final schedule and timezone (allow runAt to set schedule)
      const scheduleToUse = req.body.schedule || schedule;
      const timeZoneToUse = req.body.timeZone || 'UTC';

      // Add job metadata into payload so triggers can act (e.g., delete one-time jobs)
      const meta = Object.assign({}, payloadBase._meta, { jobId: finalJobId, projectId, locationId });
      if (isOneTime) meta.oneTime = true;
      const payload = Object.assign({}, payloadBase, { _meta: meta });
      const payloadStr = JSON.stringify(payload);

      const job = {
        name: `${parent}/jobs/${finalJobId}`,
        schedule: scheduleToUse,
        timeZone: timeZoneToUse,
        httpTarget: {
          uri: finalTarget,
          httpMethod: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cloud-scheduler-secret': CLOUD_SCHEDULER_SECRET
          },
          // The client accepts a Buffer for the body; include it inside httpTarget
          body: Buffer.from(payloadStr, 'utf8'),
        },
      };

      const [response] = await client.createJob({ parent, job });

      // Return the assigned jobId so callers know the real name used
      res.status(200).json({ message: `Job ${response.name} created successfully!`, job: response, assignedJobId: finalJobId });
    } catch (error) {
      console.error('ERROR:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete(`${prefix}/delete-job/:jobId`, authenticate, ensureAdmin, async (req, res) => {
    try {
      const { jobId } = req.params;
      const projectId = req.query.projectId || DEFAULT_PROJECT;
      const locationId = req.query.locationId || DEFAULT_LOCATION;

      if (!jobId) return res.status(400).json({ error: 'Missing jobId in path' });

      const jobName = client.jobPath(projectId, locationId, jobId);

      await client.deleteJob({ name: jobName });

      res.status(200).json({ message: `Job ${jobId} deleted successfully.` });
    } catch (error) {
      console.error('DELETE ERROR:', error);
      res.status(500).json({ error: error.message, code: error.code });
    }
  });

  // List all jobs for a project/location
  app.get(`${prefix}/jobs`, authenticate, ensureAdmin, async (req, res) => {
    try {
      const projectId = req.query.projectId || DEFAULT_PROJECT;
      const locationId = req.query.locationId || DEFAULT_LOCATION;
      const parent = client.locationPath(projectId, locationId);

      const [jobs] = await client.listJobs({ parent });

      const mapped = (jobs || []).map((j) => {
        let parsedBody = null;
        try {
          const b = j.httpTarget && j.httpTarget.body;
          if (b) {
            const s = Buffer.isBuffer(b) ? b.toString() : String(b);
            parsedBody = JSON.parse(s);
          }
        } catch (e) {
          // ignore parse errors, fall back to raw string
          parsedBody = (j.httpTarget && j.httpTarget.body) ? (Buffer.isBuffer(j.httpTarget.body) ? j.httpTarget.body.toString() : String(j.httpTarget.body)) : null;
        }

        return {
          name: j.name,
          schedule: j.schedule,
          timeZone: j.timeZone,
          state: j.state,
          httpTarget: {
            uri: j.httpTarget && j.httpTarget.uri,
            headers: j.httpTarget && j.httpTarget.headers,
            body: parsedBody,
          },
          description: j.description || null,
        };
      });

      res.status(200).json({ jobs: mapped });
    } catch (err) {
      console.error('LIST JOBS ERROR:', err);
      res.status(500).json({ error: err.message || String(err) });
    }
  });
};
