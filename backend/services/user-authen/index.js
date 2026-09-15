const express = require('express');
const admin = require('firebase-admin');

module.exports = function registerAuthRoutes(app, deps = {}) {
  if (!app) throw new Error('registerAuthRoutes requires express app');
  
  const {
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
  } = deps;

  app.get('/checkhealthauthen', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/user/register', async (req, res) => {
    try {
      const { username, password, name, email, phone } = req.body;
      if (!username || !password || !name || !phone) return res.status(400).json({ error: 'username, password, name and phone are required' });
      const existing = await findUserByUsername(username);
      if (existing) return res.status(409).json({ error: 'Username already exists' });

      // check phone uniqueness
      const phoneSnap = await usersCollection.where('phone', '==', phone).limit(1).get();
      if (!phoneSnap.empty) return res.status(409).json({ error: 'Phone already registered' });

      const hashed = bcrypt.hashSync(password, 10);
      const docRef = await usersCollection.add({
        username,
        name,
        email: email || '',
        phone,
        password: hashed,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.status(201).json({ id: docRef.id, username, name, email: email || '', phone, is_active: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/user/line/register', async (req, res) => {
    try {
      const { username, name, email, phone } = req.body;
      if (!username|| !name || !phone) return res.status(400).json({ error: 'username, and phone are required' });
      const existing = await findUserByUsername(username);
      if (existing) return res.status(409).json({ error: 'Username already exists' });

      // check phone uniqueness
      const phoneSnap = await usersCollection.where('phone', '==', phone).limit(1).get();
      if (!phoneSnap.empty) return res.status(409).json({ error: 'Phone already registered' });

      // const hashed = bcrypt.hashSync(password, 10);
      const docRef = await usersCollection.add({
        username,
        name,
        email: email || '',
        phone,
        is_active: true,
        is_line_user: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.status(201).json({ id: docRef.id, username, name, email: email || '', phone, is_active: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/user/line/login', async (req, res) => {
    try {
      const { username } = req.body; // `username` may be actual username or phone number
      if (!username) return res.status(400).json({ error: 'username and password are required' });
      const user = await findUserByIdentifier(username);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const token = generateToken(user);
      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/user/login', async (req, res) => {
    try {
      const { username, password } = req.body; // `username` may be actual username or phone number
      if (!username || !password) return res.status(400).json({ error: 'username and password are required' });
      const user = await findUserByIdentifier(username);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const ok = bcrypt.compareSync(password, user.password);
      if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
      const token = generateToken(user);
      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  app.post('/user/logout', authenticate, (req, res) => {
    const token = req.token;
    tokenBlacklist.add(token);
    res.json({ ok: true });
  });

  app.get('/profile', authenticate, async (req, res) => {
    try {
      const docRef = usersCollection.doc(req.user.id);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: 'User not found' });
      const data = doc.data() || {};
      return res.json({ id: doc.id, username: data.username || null, name: data.name || null, email: data.email || null, phone: data.phone || null });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal error' });
    }
  });

  // PUT /profile - update current user's profile
  app.put('/profile', authenticate, async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      const docRef = usersCollection.doc(req.user.id);
      const doc = await docRef.get();
      
      if (!doc.exists) return res.status(404).json({ error: 'User not found' });
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) {
        // Check phone uniqueness if changing
        const currentData = doc.data();
        if (phone !== currentData.phone) {
          const phoneSnap = await usersCollection.where('phone', '==', phone).limit(1).get();
          if (!phoneSnap.empty && phoneSnap.docs[0].id !== req.user.id) {
            return res.status(409).json({ error: 'Phone number already registered' });
          }
        }
        updateData.phone = phone;
      }
      
      await docRef.update(updateData);
      
      // Return updated profile
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data() || {};
      return res.json({ 
        id: updatedDoc.id, 
        username: data.username || null, 
        name: data.name || null, 
        email: data.email || null, 
        phone: data.phone || null 
      });
    } catch (err) {
      console.error('Error updating profile:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  });

  // GET /user/is-admin - return whether the current user has the 'admin' role
  app.get('/users/isadmin', authenticate, async (req, res) => {
    console.log('is-admin check for user:', req.user);
    try {
      const userId = req.user && req.user.id;
      if (!userId) return res.status(401).json({ error: 'Missing user' });

      const userRolesSnap = await db.collection('user_roles').where('user_id', '==', userId).get();
      if (userRolesSnap.empty) return res.json({ isAdmin: false });

      const roleIds = userRolesSnap.docs.map(d => d.data().role_id);
      if (roleIds.length === 0) return res.json({ isAdmin: false });

      const roleDocs = await Promise.all(roleIds.map(id => rolesCollection.doc(id).get()));
      const isAdmin = roleDocs.some(d => d.exists && d.data().name === 'admin');

      res.json({ isAdmin: !!isAdmin });
    } catch (err) {
      console.error('is-admin error', err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // Get roles and permissions for current user
  app.get('/user/profile/roles-permissions', authenticate, ensureAdmin, async (req, res) => {
    try {
      const userId = req.user.id;
      const userRolesSnap = await db.collection('user_roles').where('user_id', '==', userId).get();
      if (userRolesSnap.empty) return res.json({ roles: [], permissions: [] });

      const roleIds = userRolesSnap.docs.map(d => d.data().role_id);

      // fetch roles
      const rolePromises = roleIds.map(id => rolesCollection.doc(id).get());
      const roleDocs = await Promise.all(rolePromises);
      const roles = roleDocs.filter(d => d.exists).map(d => ({ id: d.id, ...d.data() }));

      if (roleIds.length === 0) return res.json({ roles, permissions: [] });

      // fetch role_permissions
      // Firestore 'in' has a limit of 10; split if necessary
      const chunkSize = 10;
      const permissionIdsSet = new Set();
      for (let i = 0; i < roleIds.length; i += chunkSize) {
        const chunk = roleIds.slice(i, i + chunkSize);
        const rpSnap = await db.collection('role_permissions').where('role_id', 'in', chunk).get();
        rpSnap.docs.forEach(d => permissionIdsSet.add(d.data().permission_id));
      }

      const permissionIds = Array.from(permissionIdsSet);
      let permissions = [];
      if (permissionIds.length > 0) {
        // fetch permission docs in chunks
        for (let i = 0; i < permissionIds.length; i += chunkSize) {
          const chunk = permissionIds.slice(i, i + chunkSize);
          const permSnap = await db.collection('permissions').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
          permSnap.docs.forEach(d => permissions.push({ id: d.id, ...d.data() }));
        }
      }

      res.json({ roles, permissions });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // Create a role
  app.post('/user/roles', authenticate, ensureAdmin, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: 'role name is required' });
      // check uniqueness
      const snap = await rolesCollection.where('name', '==', name).limit(1).get();
      if (!snap.empty) return res.status(409).json({ error: 'Role already exists' });
      const docRef = await rolesCollection.add({
        name,
        description: description || '',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      res.status(201).json({ id: docRef.id, name, description: description || '' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal error' });
    }
  });

  // GET /users - Get all users (admin only)
  app.get('/users', authenticate, ensureAdmin, async (req, res) => {
    try {
      const snapshot = await usersCollection.orderBy('created_at', 'desc').get();
      const users = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data() || {};
        // Don't expose password
        const { password, ...userData } = data;
        
        // Normalize created_at timestamp
        if (userData.created_at && typeof userData.created_at.toDate === 'function') {
          userData.created_at = userData.created_at.toDate().toISOString();
        }
        
        users.push({ id: doc.id, ...userData });
      }
      
      res.json({ users });
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });
};
