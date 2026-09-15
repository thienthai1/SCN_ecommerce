// dependencies
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore, Timestamp, FieldValue, Filter } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
inspect = require('util').inspect;
var busboy = require('busboy');
let webpush = require('web-push');
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// Redis optional configuration for BullMQ
const redisEnabled = false;
let redisConnection = null;
if (redisEnabled) {
    redisConnection = new IORedis(process.env.REDIS_URL || 'rediss://red-d5oc3dvpm1nc738v1aeg:bb4blo3Q706FWhQHgy8W6Ffm8Yl87gy2@singapore-keyvalue.render.com:6379', {
        maxRetriesPerRequest: null
    });
}


// Notification Queue (use Redis-backed2 Queue when enabled, otherwise an in-memory fallback)
let notificationQueue;
if (redisEnabled) {
    notificationQueue = new Queue('notifications', { connection: redisConnection });
} else {
    const { EventEmitter } = require('events');
    class InMemoryQueue extends EventEmitter {
        constructor() {
            super();
            this.jobs = new Map();
            this._processor = null;
        }
        setProcessor(fn) { this._processor = fn; }
        async add(name, data, opts = {}) {
            const id = `im-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = Date.now();
            const job = {
                id,
                name,
                data,
                opts,
                timestamp,
                getState: async () => 'waiting',
                remove: async () => { this.jobs.delete(id); }
            };
            this.jobs.set(id, job);
            const delay = opts.delay || 0;
            if (delay <= 0) setImmediate(() => this._run(job));
            else setTimeout(() => this._run(job), delay);
            return job;
        }
        async getDelayed() {
            return Array.from(this.jobs.values()).filter(j => j.opts && j.opts.delay && (j.timestamp + (j.opts.delay || 0) > Date.now()));
        }
        async getWaiting() {
            return Array.from(this.jobs.values()).filter(j => !(j.opts && j.opts.delay));
        }
        async getJob(id) {
            return this.jobs.get(id) || null;
        }
        async _run(job) {
            if (!this._processor) return;
            try {
                await this._processor(job);
                this.emit('completed', job, { success: true });
            } catch (err) {
                this.emit('failed', job, err);
            } finally {
                this.jobs.delete(job.id);
            }
        }
    }
    const inMemoryQueue = new InMemoryQueue();
    notificationQueue = inMemoryQueue;
}


// initialize firebase admin SDK
const serviceAccount = require('./service-account-key.json');

// config express app
const app = express();
const port = process.env.PORT || 3000;
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ limit: '3mb', extended: true }));

// CORS middleware for all routes
app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'scnshop-3300f.firebasestorage.app'
});

const db = getFirestore();
let bucket = getStorage().bucket();
let UUID = require('uuid-v4');

// Global auth configuration
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET';
const tokenBlacklist = new Set();
const usersCollection = db.collection('users');
const rolesCollection = db.collection('roles');

// Generate JWT token for user
function generateToken(user) {
  const payload = { id: user.id, username: user.username, name: user.name };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

// Find user by username fix smt
async function findUserByUsername(username) {
  const snapshot = await usersCollection.where('username', '==', username).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

// Find by username first, then by phone
async function findUserByIdentifier(identifier) {
  const byUsername = await findUserByUsername(identifier);
  if (byUsername) return byUsername;
  const snap = await usersCollection.where('phone', '==', identifier).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

// Authentication middleware
async function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  if (tokenBlacklist.has(token)) return res.status(401).json({ error: 'Token revoked' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await findUserByUsername(payload.username);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user.id, username: user.username, name: user.name, email: user.email || null, phone: user.phone || null };
    req.token = token;
    next();
  } catch (err) {
    console.log('Authentication error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Middleware to ensure the current user has the 'admin' roles
async function ensureAdmin(req, res, next) {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Missing user' });

    const userRolesSnap = await db.collection('user_roles').where('user_id', '==', userId).get();
    if (userRolesSnap.empty) return res.status(403).json({ error: 'Forbidden' });

    const roleIds = userRolesSnap.docs.map(d => d.data().role_id);
    if (roleIds.length === 0) return res.status(403).json({ error: 'Forbidden' });

    const rolesSnap = await db.collection('roles').doc(roleIds[0]).get();
    
    if(!rolesSnap.exists) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (rolesSnap.data().name === 'admin') {
      return next();
    } else {
      return res.status(403).json({ error: 'Forbidden' });
    }

  } catch (err) {
    console.error('ensureAdmin error', err);
    res.status(500).json({ error: 'Internal error' });
  }
}

// config webpush
webpush.setVapidDetails(
  'mailto:test@tset.org',
  'BLnzozSiqMOtMmrHeV5MTrdCAAIgiaf2mB7_PoRkynwmsCfal-3hLQ4wo2_kguGhR3jDSAnPDFiB8Uhu1qZxyU4',
  'Elnz5ejssMXraPJesp-h5wfRUPTThj8iu7zl6KjPTbk'
);

// Simple marketplace test route
// Marketplace routes moved to services/marketplace
const registerMarketplaceRoutes = require('./services/marketplace');
registerMarketplaceRoutes(app, { db, Timestamp, UUID, bucket, authenticate, ensureAdmin, FieldValue });

// User authentication routes
const registerAuthRoutes = require('./services/user-authen');
registerAuthRoutes(app, {
  db,
  bcrypt,
  jwt,
  JWT_SECRET,
  tokenBlacklist,
  usersCollection,
  rolesCollection,
  generateToken,
  findUserByUsername,
  findUserByIdentifier,
  authenticate,
  ensureAdmin,
  FieldValue
});


// Cloud Scheduler routes (mounted on the same backend port)
const registerCloudSchedulerRoutes = require('./services/clould-scheduler');

// Omise Payment routes
const registerOmisePaymentRoutes = require('./services/omise-payment');

// Register Cloud Scheduler routes after helper functions (so we can inject db/Timestamp/sendPushNotificationToAll)
registerCloudSchedulerRoutes(app, { db, Timestamp, sendPushNotificationToAll, authenticate, ensureAdmin });

registerOmisePaymentRoutes(app, { authenticate, ensureAdmin });

// Reusable function to send push notifications to all subscribers
async function sendPushNotificationToAll(title, body, openUrl = '/#/') {
    try {
        const snapshot = await db.collection('subscriptions').get();
        const subscriptions = [];
        
        snapshot.forEach((doc) => {
            subscriptions.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`Sending push to ${subscriptions.length} subscribers`);
        
        const pushContent = JSON.stringify({ title, body, openUrl });
        
        const sendPromises = subscriptions.map(subscription => {
            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    auth: (subscription.keys && subscription.keys.auth) || subscription['keys[auth]'],
                    p256dh: (subscription.keys && subscription.keys.p256dh) || subscription['keys[p256dh]']
                }
            };
            return webpush.sendNotification(pushSubscription, pushContent).catch(err => {
                console.error('Push notification failed for subscription:', subscription.id, err.message);
            });
        });
        
        await Promise.all(sendPromises);
        console.log('Push notifications sent successfully');
    } catch (err) {
        console.error('Error sending push notifications:', err);
    }
}

// Notification Queue Worker - processes scheduled notifications
let notificationWorker;
const processor = async (job) => {
    const { title, body, openUrl, firestoreDocId } = job.data;
    console.log(`Processing scheduled notification: ${title}`);
    try {
        await sendPushNotificationToAll(title, body, openUrl);
        await db.collection('notifications').add({
            title,
            description: body,
            date: Timestamp.now()
        });
        console.log('Added notification to notifications collection');
        if (firestoreDocId) {
            await db.collection('scheduled_notifications').doc(firestoreDocId).update({
                status: 'completed',
                completedAt: Timestamp.now()
            });
            console.log(`Updated Firestore doc ${firestoreDocId} to completed`);
        }
        return { success: true, sentAt: new Date().toISOString() };
    } catch (err) {
        if (firestoreDocId) {
            await db.collection('scheduled_notifications').doc(firestoreDocId).update({
                status: 'failed',
                failedAt: Timestamp.now(),
                error: err.message
            });
        }
        throw err;
    }
};

if (redisEnabled) {
    notificationWorker = new Worker('notifications', processor, { connection: redisConnection });
} else {
    // Attach the processor to the in-memory queue and use it as the worker emitter
    if (typeof notificationQueue.setProcessor === 'function') {
        notificationQueue.setProcessor(async (job) => {
            // job in in-memory queue matches expected shape
            await processor(job);
        });
    }
    notificationWorker = notificationQueue; // in-memory queue also emits events
}

notificationWorker.on('completed', (job, result) => {
    console.log(`Notification job ${job.id} completed:`, result);
});

notificationWorker.on('failed', (job, err) => {
    console.error(`Notification job ${job.id} failed:`, err.message || err);
});

// POST /schedule-notification - Schedule a notification to be sent at a specific time
// scheduledTime: ISO 8601 date string (e.g., "2026-01-18T10:00:00Z")
app.post('/schedule-notification', async (req, res) => {
    try {
        const { title, body, openUrl, scheduledTime } = req.body;
        
        if (!title || !body) {
            return res.status(400).json({ error: 'title and body are required' });
        }
        
        if (!scheduledTime) {
            return res.status(400).json({ error: 'scheduledTime is required (ISO 8601 format, e.g., "2026-01-18T10:00:00Z")' });
        }
        
        const scheduledDate = new Date(scheduledTime);
        const now = new Date();
        const delay = scheduledDate.getTime() - now.getTime();
        
        if (delay < 0) {
            return res.status(400).json({ error: 'scheduledTime must be in the future' });
        }
        
        const jobId = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Save to Firestore with pending status
        const firestoreDoc = await db.collection('scheduled_notifications').add({
            title,
            body,
            openUrl: openUrl || '/#/',
            scheduledFor: Timestamp.fromDate(scheduledDate),
            status: 'pending',
            jobId,
            createdAt: Timestamp.now()
        });
        
        const job = await notificationQueue.add(
            'scheduled-notification',
            { title, body, openUrl: openUrl || '/#/', firestoreDocId: firestoreDoc.id },
            { delay, jobId }
        );
        
        res.json({
            message: 'Notification scheduled successfully',
            jobId: job.id,
            firestoreDocId: firestoreDoc.id,
            scheduledFor: scheduledDate.toISOString(),
            delayMs: delay
        });
    } catch (err) {
        console.error('Error scheduling notification:', err);
        res.status(500).json({ error: 'Failed to schedule notification' });
    }
});

// GET /pending-notifications - Get all pending scheduled notifications
app.get('/pending-notifications', async (req, res) => {
    try {
        const delayedJobs = await notificationQueue.getDelayed();
        const waitingJobs = await notificationQueue.getWaiting();
        
        const pendingNotifications = [...delayedJobs, ...waitingJobs].map(job => ({
            jobId: job.id,
            title: job.data.title,
            body: job.data.body,
            openUrl: job.data.openUrl,
            scheduledFor: new Date(job.timestamp + (job.opts.delay || 0)).toISOString(),
            delay: job.opts.delay,
            createdAt: new Date(job.timestamp).toISOString()
        }));
        
        // Sort by scheduled time
        pendingNotifications.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
        
        res.json({
            count: pendingNotifications.length,
            notifications: pendingNotifications
        });
    } catch (err) {
        console.error('Error fetching pending notifications:', err);
        res.status(500).json({ error: 'Failed to fetch pending notifications' });
    }
});

// DELETE /pending-notifications/:jobId - Cancel a specific pending notification
app.delete('/pending-notifications/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = await notificationQueue.getJob(jobId);
        
        if (!job) {
            return res.status(404).json({ error: 'Notification job not found' });
        }
        
        // Check if job is still pending (not completed or failed)
        const state = await job.getState();
        if (state === 'completed' || state === 'failed') {
            return res.status(400).json({ 
                error: 'Cannot cancel notification', 
                reason: `Job is already ${state}` 
            });
        }
        
        // Update Firestore document status to cancelled
        if (job.data.firestoreDocId) {
            await db.collection('scheduled_notifications').doc(job.data.firestoreDocId).update({
                status: 'cancelled',
                cancelledAt: Timestamp.now()
            });
        }
        
        await job.remove();
        
        res.json({
            message: 'Notification cancelled successfully',
            jobId,
            title: job.data.title
        });
    } catch (err) {
        console.error('Error cancelling notification:', err);
        res.status(500).json({ error: 'Failed to cancel notification' });
    }
});

// DELETE /pending-notifications - Clear all pending notifications
app.delete('/pending-notifications', async (req, res) => {
    try {
        const delayedJobs = await notificationQueue.getDelayed();
        const waitingJobs = await notificationQueue.getWaiting();
        
        const allJobs = [...delayedJobs, ...waitingJobs];
        const removedCount = allJobs.length;
        
        await Promise.all(allJobs.map(job => job.remove()));
        
        res.json({
            message: 'All pending notifications cleared',
            removedCount
        });
    } catch (err) {
        console.error('Error clearing pending notifications:', err);
        res.status(500).json({ error: 'Failed to clear pending notifications' });
    }
});

// initialize firebase admin SDK
app.get('/', (req, res) => {
    res.send('Hello World!');
});


// Hash password with SHA-256
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /login - backoffice login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    
    try {
        // Find user in Firestore by username
        const usersSnapshot = await db.collection('user').where('username', '==', username).get();
        
        if (usersSnapshot.empty) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Get the first matching user
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Hash the incoming password and compare with stored hash
        const hashedPassword = hashPassword(password);
        
        if (hashedPassword === userData.password) {
            // Generate a simple token (in production, use JWT)
            const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
            return res.json({
                success: true,
                message: 'Login successful',
                token,
                user: { username }
            });
        }
        
        return res.status(401).json({ error: 'Invalid username or password' });
    } catch (err) {
        console.error('Error during login:', err);
        return res.status(500).json({ error: 'Login failed' });
    }
});

// POST /change-password - change user password
app.post('/change-password', async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    
    if (!username || !currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Username, current password, and new password are required' });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }
    
    try {
        // Find user in Firestore by username
        const usersSnapshot = await db.collection('user').where('username', '==', username).get();
        
        if (usersSnapshot.empty) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get the first matching user
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Verify current password
        const hashedCurrentPassword = hashPassword(currentPassword);
        
        if (hashedCurrentPassword !== userData.password) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password and update
        const hashedNewPassword = hashPassword(newPassword);
        
        await db.collection('user').doc(userDoc.id).update({
            password: hashedNewPassword
        });
        
        return res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (err) {
        console.error('Error changing password:', err);
        return res.status(500).json({ error: 'Failed to change password' });
    }
});

// listen
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

// Create subscription (attach to authenticated user)
app.post('/createSubscription', authenticate, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    try {
        const { endpoint, keys } = req.body || {};
        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({ error: 'Invalid subscription payload' });
        }

        const userId = req.user && req.user.id;
        if (!userId) return res.status(401).json({ error: 'User not authenticated' });

        const subscriptionRecord = {
            user_id: userId,
            endpoint,
            keys: {
                p256dh: keys.p256dh,
                auth: keys.auth
            },
            updated_at: FieldValue.serverTimestamp()
        };

        // Upsert into global subscriptions collection
        const existing = await db.collection('subscriptions')
            .where('user_id', '==', userId)
            .where('endpoint', '==', endpoint)
            .limit(1)
            .get();

        if (existing.empty) {
            await db.collection('subscriptions').add({
                ...subscriptionRecord,
                created_at: FieldValue.serverTimestamp()
            });
        } else {
            await existing.docs[0].ref.update(subscriptionRecord);
        }

        // Save subscription into user's subscription list (multiple devices)
        // Note: Firestore does not allow serverTimestamp() inside arrayUnion elements,
        // so we store only endpoint+keys in the array and set a separate last_subscription_at timestamp.
        try {
            await usersCollection.doc(userId).update({
                notification_subscriptions: FieldValue.arrayUnion({
                    endpoint,
                    keys: subscriptionRecord.keys
                })
            });
        } catch (err) {
            // If update fails because doc doesn't exist, create it with the array
            await usersCollection.doc(userId).set({
                notification_subscriptions: [
                    { endpoint, keys: subscriptionRecord.keys }
                ]
            }, { merge: true });
        }

        // Save last subscription timestamp on user document
        try {
            await usersCollection.doc(userId).update({ last_subscription_at: FieldValue.serverTimestamp() });
        } catch (e) {
            // If update fails (unlikely), merge it
            await usersCollection.doc(userId).set({ last_subscription_at: FieldValue.serverTimestamp() }, { merge: true });
        }

        res.json({ message: 'Subscription saved', subscription: { endpoint, keys: subscriptionRecord.keys } });
    } catch (e) {
        console.error('Error creating subscription:', e);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// POST /checkSubscription - check if browser is already subscribed
app.post('/checkSubscription', async (req, res) => {
    try {
        res.set('Access-Control-Allow-Origin', '*');
        const { endpoint, user_id } = req.body || {};

        if (!endpoint) {
            return res.status(400).json({ error: 'endpoint is required' });
        }

        // If a user_id is provided, check the user's notification_subscriptions array first
        if (user_id) {
            try {
                const userDoc = await usersCollection.doc(user_id).get();
                if (userDoc.exists) {
                    const data = userDoc.data() || {};
                    const subs = Array.isArray(data.notification_subscriptions) ? data.notification_subscriptions : [];
                    const found = subs.some(s => s && s.endpoint === endpoint);
                    return res.json({ isSubscribed: found, message: found ? 'Browser is subscribed for user' : 'Browser is not subscribed for user' });
                } else {
                    return res.json({ isSubscribed: false, message: 'User not found' });
                }
            } catch (err) {
                console.error('Error checking user subscriptions:', err);
                return res.status(500).json({ error: 'Failed to check user subscriptions' });
            }
        }

        // Fallback: check global subscriptions collection by endpoint
        const snapshot = await db.collection('subscriptions')
            .where('endpoint', '==', endpoint)
            .get();

        const isSubscribed = !snapshot.empty;
        res.json({ isSubscribed, message: isSubscribed ? 'Browser is subscribed' : 'Browser is not subscribed' });
    } catch (err) {
        console.error('Error checking subscription:', err);
        res.status(500).json({ error: 'Failed to check subscription' });
    }
});

// POST /auth/verify-line - verify LINE id_token with LINE OAuth verify endpoint
app.post('/auth/verify-line', async (req, res) => {
    try {
        res.set('Access-Control-Allow-Origin', '*');
        const idToken = req.body && (req.body.id_token || req.body.idToken);
        if (!idToken) return res.status(400).json({ error: 'id_token is required' });

        const clientId = '2008961587-8IiiFID9';
        if (!clientId) return res.status(500).json({ error: 'Server misconfigured: missing LINE_CHANNEL_ID' });

        const params = new URLSearchParams({ id_token: idToken, client_id: clientId });

        const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params
        });
        console.log('LINE verify response status:', response.status);
        const result = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({ error: 'LINE verification failed', details: result });
        }

        // result contains fields like iss, sub, aud, exp, iat etc.
        return res.json({ success: true, ...result });
    } catch (err) {
        console.error('Error verifying LINE id_token', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/sendNotification', async (request, respond) => {
    respond.set('Access-Control-Allow-Origin', '*'); // Allow CORS for all origins
    function sendPushNotification() {
        const subscriptions = [];
        let uuid = UUID();

        db.collection('subscriptions').get().then((snapshot) => {
            
            snapshot.forEach((doc) => {
                subscriptions.push({ id: doc.id, ...doc.data() });
            });

            return subscriptions;
        }).then((subscriptions) => {
            console.log('Subscriptions:', subscriptions);
            subscriptions.forEach(subscription => {

            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    auth: (subscription.keys && subscription.keys.auth) || subscription['keys[auth]'],
                    p256dh: (subscription.keys && subscription.keys.p256dh) || subscription['keys[p256dh]']
                }
            };

            let pushContent = {
                title: 'Test Notification',
                body: 'This is a test push notification.',
                openUrl: '/#/'
            }

            let pushContentStringified = JSON.stringify(pushContent);

                webpush.sendNotification(pushSubscription, pushContentStringified);
            })
        })
    }

    sendPushNotification();

    respond.send({ message: 'Notifications sent successfully.' });
})

// GET /articles - list all articles
app.get('/articles', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    try {
        const snapshot = await db.collection('article').orderBy('time', 'desc').get();
        const articles = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to ISO string when possible
            if (data && data.time && typeof data.time.toDate === 'function') {
                data.time = data.time.toDate().toISOString();
            }
            return { id: doc.id, ...data };
        });
        res.json({ articles });
    } catch (err) {
        console.error('Error fetching articles:', err);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

// GET /articles/:id - get a single article by document id
app.get('/articles/:id', async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const id = req.params.id;
    try {
        const docRef = db.collection('article').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Article not found' });
        }
        const data = doc.data();
        if (data && data.time && typeof data.time.toDate === 'function') {
            data.time = data.time.toDate().toISOString();
        }
        res.json({ id: doc.id, ...data });
    } catch (err) {
        console.error('Error fetching article:', err);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});

// POST /articles - create a new article
app.post('/createArticles', async (req, res) => {
    try {
        const { title, content, image } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }
        
        const newArticle = {
            title,
            content: content || '',
            image: image || '',
            time: Timestamp.now()
        };
        
        const docRef = await db.collection('article').add(newArticle);
        
        // Send push notification to all users
        sendPushNotificationToAll(
            'New Article: ' + title,
            content ? content.substring(0, 100) + '...' : 'Check out our new article!',
            '/#/'
        );
        
        res.status(201).json({
            message: 'Article created',
            id: docRef.id,
            ...newArticle,
            time: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error creating article:', err);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

// PUT /articles/:id - update an article
app.put('/articles/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { title, content, image } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }
        
        const docRef = db.collection('article').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        const updatedArticle = {
            title,
            content: content || '',
            image: image || ''
        };
        
        await docRef.update(updatedArticle);
        
        res.json({
            message: 'Article updated',
            id,
            ...updatedArticle
        });
    } catch (err) {
        console.error('Error updating article:', err);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// DELETE /articles/:id - delete an article
app.delete('/articles/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const docRef = db.collection('article').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        await docRef.delete();
        
        res.json({ message: 'Article deleted', id });
    } catch (err) {
        console.error('Error deleting article:', err);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

// GET /notifications - list all notifications
app.get('/notifications', async (req, res) => {
    try {
        const snapshot = await db.collection('notifications').orderBy('date', 'desc').get();
        console.log('Fetched notifications snapshot:', snapshot);
        const notifications = snapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to readable string (field is 'date')
            if (data && data.date && typeof data.date.toDate === 'function') {
                const date = data.date.toDate();
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);
                const diffDays = Math.floor(diffMs / 86400000);
                
                if (diffMins < 60) {
                    data.date = diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
                } else if (diffHours < 24) {
                    data.date = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
                } else if (diffDays < 7) {
                    data.date = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
                } else {
                    data.date = date.toLocaleDateString();
                }
            }
            return { id: doc.id, ...data };
        });
        res.json({ notifications });
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// POST /notifications - create a new notification
app.post('/createNotifications', async (req, res) => {
    try {
        const { title, description } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ error: 'title and description are required' });
        }
        
        const newNotification = {
            title,
            description,
            date: Timestamp.now()
        };
        
        const docRef = await db.collection('notifications').add(newNotification);
        
        // Send push notification to all users
        sendPushNotificationToAll(
            title,
            description,
            '/#/'
        );
        
        res.status(201).json({
            message: 'Notification created',
            id: docRef.id,
            ...newNotification,
            date: 'Just now'
        });
    } catch (err) {
        console.error('Error creating notification:', err);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});
// Test endpoint: send notification to specific user
// POST /sendNotificationToUser
// Body: { user_id, title, body, openUrl? }
app.post('/sendNotificationToUser', authenticate, ensureAdmin, async (req, res) => {
    try {
        const { user_id, title, body, openUrl } = req.body || {};
        if (!user_id || !title || !body) return res.status(400).json({ error: 'user_id, title and body are required' });

        // Build list of subscriptions to send to (from user's doc and fallback collection)
        const subsToSend = [];

        const userRef = usersCollection.doc(user_id);
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            const d = userDoc.data() || {};
            if (Array.isArray(d.notification_subscriptions) && d.notification_subscriptions.length > 0) {
                d.notification_subscriptions.forEach(s => {
                    if (s && s.endpoint) subsToSend.push({ endpoint: s.endpoint, keys: s.keys || {} });
                });
            }
            // backward compatibility for single-field
            if (d.notification_subscription && d.notification_subscription.endpoint) {
                subsToSend.push({ endpoint: d.notification_subscription.endpoint, keys: d.notification_subscription.keys || {} });
            }
        }

        // Fallback: include any entries from the global `subscriptions` collection for this user
        try {
            const snap = await db.collection('subscriptions').where('user_id', '==', user_id).get();
            snap.forEach(doc => {
                const sd = doc.data() || {};
                if (sd.endpoint) subsToSend.push({ endpoint: sd.endpoint, keys: sd.keys || { p256dh: sd['keys[p256dh]'], auth: sd['keys[auth]'] } });
            });
        } catch (e) {
            console.error('Error fetching fallback subscriptions:', e);
        }

        // Deduplicate by endpoint
        const dedupMap = new Map();
        subsToSend.forEach(s => {
            if (!s || !s.endpoint) return;
            if (!dedupMap.has(s.endpoint)) dedupMap.set(s.endpoint, s);
        });

        const uniqueSubs = Array.from(dedupMap.values());
        if (uniqueSubs.length === 0) return res.status(404).json({ error: 'No subscription found for user' });

        const payload = JSON.stringify({ title, body, openUrl: openUrl || '/#/' });

        // Send to all subscriptions and collect results
        const sendResults = await Promise.allSettled(uniqueSubs.map(async (subscription) => {
            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    auth: (subscription.keys && subscription.keys.auth) || subscription['keys[auth]'],
                    p256dh: (subscription.keys && subscription.keys.p256dh) || subscription['keys[p256dh]']
                }
            };
            try {
                await webpush.sendNotification(pushSubscription, payload);
                return { endpoint: subscription.endpoint, success: true };
            } catch (err) {
                return { endpoint: subscription.endpoint, success: false, error: err && err.message ? err.message : String(err) };
            }
        }));

        const successes = sendResults.filter(r => r.status === 'fulfilled' && r.value && r.value.success).length;
        const failures = sendResults.length - successes;

        // Record a single notification entry (with stats) to Firestore
        await db.collection('notifications').add({ title, description: body, user_id, date: Timestamp.now(), delivered: successes, failed: failures });

        return res.json({ message: 'Notification send summary', user_id, attempted: sendResults.length, delivered: successes, failed: failures, details: sendResults.map(r => (r.status === 'fulfilled' ? r.value : { success: false, error: r.reason })) });
    } catch (err) {
        console.error('Error sending notification to user:', err);
        return res.status(500).json({ error: 'Failed to send notification' });
    }
});

// PUT /notifications/:id - update a notification
app.put('/notifications/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { title, description } = req.body;
        
        if (!title || !description) {
            return res.status(400).json({ error: 'title and description are required' });
        }
        
        const docRef = db.collection('notifications').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        const updatedNotification = {
            title,
            description
        };
        
        await docRef.update(updatedNotification);
        
        res.json({
            message: 'Notification updated',
            id,
            ...updatedNotification
        });
    } catch (err) {
        console.error('Error updating notification:', err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// DELETE /notifications/:id - delete a notification
app.delete('/notifications/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const docRef = db.collection('notifications').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        await docRef.delete();
        
        res.json({ message: 'Notification deleted', id });
    } catch (err) {
        console.error('Error deleting notification:', err);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

// ==================== SLIDE ENDPOINTS ====================

// GET /slides - list all slides
app.get('/slides', async (req, res) => {
    try {
        const snapshot = await db.collection('slide').orderBy('order', 'asc').get();
        const slides = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.json({ slides });
    } catch (err) {
        console.error('Error fetching slides:', err);
        res.status(500).json({ error: 'Failed to fetch slides' });
    }
});

// GET /slides/:id - get a single slide
app.get('/slides/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const docRef = db.collection('slide').doc(id);
        const doc = await docRef.get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Slide not found' });
        }
        res.json({ id: doc.id, ...doc.data() });
    } catch (err) {
        console.error('Error fetching slide:', err);
        res.status(500).json({ error: 'Failed to fetch slide' });
    }
});

// POST /slides - create a new slide
app.post('/slides', async (req, res) => {
    try {
        const { image_url, order } = req.body;
        
        if (!image_url) {
            return res.status(400).json({ error: 'image_url is required' });
        }
        
        const newSlide = {
            image_url,
            order: typeof order === 'number' ? order : 0
        };
        
        const docRef = await db.collection('slide').add(newSlide);
        
        res.status(201).json({
            message: 'Slide created',
            id: docRef.id,
            ...newSlide
        });
    } catch (err) {
        console.error('Error creating slide:', err);
        res.status(500).json({ error: 'Failed to create slide' });
    }
});

// PUT /slides/:id - update a slide
app.put('/slides/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const { image_url, order } = req.body;
        
        if (!image_url) {
            return res.status(400).json({ error: 'image_url is required' });
        }
        
        const docRef = db.collection('slide').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Slide not found' });
        }
        
        const updatedSlide = {
            image_url,
            order: typeof order === 'number' ? order : 0
        };
        await docRef.update(updatedSlide);
        
        res.json({
            message: 'Slide updated',
            id,
            ...updatedSlide
        });
    } catch (err) {
        console.error('Error updating slide:', err);
        res.status(500).json({ error: 'Failed to update slide' });
    }
});

// DELETE /slides/:id - delete a slide
app.delete('/slides/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const docRef = db.collection('slide').doc(id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Slide not found' });
        }
        
        await docRef.delete();
        
        res.json({ message: 'Slide deleted', id });
    } catch (err) {
        console.error('Error deleting slide:', err);
        res.status(500).json({ error: 'Failed to delete slide' });
    }
});
