const fs = require('node:fs/promises');
const { mkdirSync } = require('node:fs');
const path = require('node:path');

function imageType(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (buffer.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) return 'image/gif';
  if (buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}
function createStorage(directory) {
  const root = path.resolve(directory);
  mkdirSync(root, { recursive: true, mode: 0o700 });
  return {
    root,
    file(name) {
      if (typeof name !== 'string' || name.includes('\\') || name.includes('\0')
          || name.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.'))) {
        throw new Error('Invalid upload path');
      }
      const target = path.resolve(root, name);
      if (!target.startsWith(root + path.sep)) throw new Error('Upload path outside storage');
      return {
        async save(buffer, options = {}) {
          const type = imageType(buffer);
          const declared = options.metadata?.contentType;
          if (!type || (declared && declared !== type)) throw new Error('Only PNG, JPEG, GIF and WebP images are supported');
          // Never serve user-chosen executable extensions from our own origin.
          const extensions = { 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/gif': ['.gif'], 'image/webp': ['.webp'] };
          if (!extensions[type].includes(path.extname(target).toLowerCase())) throw new Error('Image extension does not match content');
          await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
          await fs.writeFile(target, buffer, { flag: 'wx', mode: 0o600 });
        },
        async delete() { await fs.unlink(target).catch(error => { if (error.code !== 'ENOENT') throw error; }); },
        publicUrl() {
          const base = (process.env.PUBLIC_API_URL || '').replace(/\/$/, '');
          return `${base}/uploads/${name.split('/').map(encodeURIComponent).join('/')}`;
        },
      };
    },
  };
}
module.exports = { createStorage };
