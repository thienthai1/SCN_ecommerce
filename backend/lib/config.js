const path = require('node:path');
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });
const dataDir = path.resolve(root, process.env.DATA_DIR || 'data');
const uploadDir = path.resolve(root, process.env.UPLOAD_DIR || 'uploads');
const databasePath = path.resolve(root, process.env.DATABASE_PATH || path.join(dataDir, 'shop.sqlite'));
function jwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const filename = path.join(dataDir, 'jwt-secret');
  try { fs.writeFileSync(filename, randomBytes(48).toString('base64url'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  return fs.readFileSync(filename, 'utf8').trim();
}
module.exports = { root, dataDir, uploadDir, databasePath, jwtSecret };
