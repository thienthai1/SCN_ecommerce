const config = require('../lib/config');
const { LocalDatabase, Timestamp } = require('../lib/database');
const bcrypt = require('bcryptjs');
const { Writable } = require('node:stream');
const readline = require('node:readline/promises');

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    if (!process.stdin.isTTY) throw new Error('Use an interactive terminal or set ADMIN_PASSWORD');
    let muted = false;
    const output = new Writable({ write(chunk, encoding, done) {
      if (!muted) process.stdout.write(chunk, encoding); done();
    } });
    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
    process.stdout.write(`Password for ${username} (at least 12 characters): `);
    muted = true;
    try { password = await rl.question(''); }
    finally { rl.close(); process.stdout.write('\n'); }
  }
  if (password.length < 12) throw new Error('Password must contain at least 12 characters');
  const db = new LocalDatabase(config.databasePath);
  try {
    const existing = await db.collection('users').where('username', '==', username).get();
    if (!existing.empty) throw new Error('Username already exists; no account was changed');
    const user = db.collection('users').doc();
    const batch = db.batch();
    batch.set(user, { username, password: bcrypt.hashSync(password, 12), name: 'Administrator',
      phone: '', email: '', is_active: true, created_at: Timestamp.now() });
    batch.set(db.collection('roles').doc('admin'), { name: 'admin', description: 'Store administrator' }, { merge: true });
    batch.set(db.collection('user_roles').doc(`${user.id}-admin`), { user_id: user.id, role_id: 'admin' });
    await batch.commit();
    console.log(`Created administrator: ${username}`);
  } finally { db.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
