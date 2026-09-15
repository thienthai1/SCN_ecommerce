// Document repository backed by a local SQLite file. The collection interface
// preserves existing route contracts; no Firebase SDK or service is used.
const { DatabaseSync } = require('node:sqlite');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');

class Timestamp {
  constructor(milliseconds) {
    if (!Number.isFinite(milliseconds)) throw new TypeError('Invalid timestamp');
    this._seconds = Math.floor(milliseconds / 1000);
    this._nanoseconds = Math.round((milliseconds - this._seconds * 1000) * 1e6);
  }
  static now() { return new Timestamp(Date.now()); }
  static fromDate(date) { return new Timestamp(date.getTime()); }
  toMillis() { return this._seconds * 1000 + this._nanoseconds / 1e6; }
  toDate() { return new Date(this.toMillis()); }
}
class ArrayUnion {
  constructor(values) { this.values = values; }
}
const FieldValue = {
  serverTimestamp: () => Timestamp.now(),
  arrayUnion: (...values) => new ArrayUnion(values),
};
function encode(value) {
  if (value instanceof Timestamp) return { __scn_timestamp: value.toMillis() };
  if (value instanceof Date) return { __scn_timestamp: value.getTime() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, encode(v)]));
  }
  return value;
}
function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && typeof value.__scn_timestamp === 'number') {
      return new Timestamp(value.__scn_timestamp);
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  }
  return value;
}
function validName(value) {
  if (typeof value !== 'string' || !value || /[\0/]/.test(value)) {
    throw new TypeError('Collection and document IDs must be non-empty strings without slashes');
  }
  return value;
}
function field(data, key, id) {
  return key === '__name__' ? id : key.split('.').reduce((v, k) => v?.[k], data);
}
function comparable(value) { return value instanceof Timestamp ? value.toMillis() : value; }

class Snapshot {
  constructor(ref, data) { this.ref = ref; this.id = ref.id; this.exists = data !== undefined; this.value = data; }
  data() { return this.exists ? decode(encode(this.value)) : undefined; }
}
class Reference {
  constructor(db, collection, id) { this.db = db; this.collection = collection; this.id = validName(id); }
  async get() { return new Snapshot(this, this.db.read(this.collection, this.id)); }
  async set(data, options = {}) { this.db.atomic(() => this.db.write(this, data, options.merge ? 'merge' : 'set')); }
  async update(data) { this.db.atomic(() => this.db.write(this, data, 'update')); }
  async delete() { this.db.remove(this.collection, this.id); }
}
class Query {
  constructor(db, name, filters = [], orders = [], max = Infinity) {
    Object.assign(this, { db, name, filters, orders, max });
  }
  where(key, operator, value) {
    if (!['==', 'in', '<', '<=', '>', '>='].includes(operator)) throw new Error(`Unsupported operator: ${operator}`);
    if (operator === 'in' && !Array.isArray(value)) throw new TypeError('in requires an array');
    return new Query(this.db, this.name, [...this.filters, [key, operator, value]], this.orders, this.max);
  }
  orderBy(key, direction = 'asc') {
    if (!['asc', 'desc'].includes(direction)) throw new TypeError('Invalid sort direction');
    return new Query(this.db, this.name, this.filters, [...this.orders, [key, direction]], this.max);
  }
  limit(max) {
    if (!Number.isInteger(max) || max < 0) throw new TypeError('Invalid limit');
    return new Query(this.db, this.name, this.filters, this.orders, max);
  }
  async get() {
    let rows = this.db.sql.prepare('SELECT id, data FROM documents WHERE collection = ? ORDER BY id').all(this.name)
      .map(row => ({ id: row.id, data: decode(JSON.parse(row.data)) }));
    rows = rows.filter(row => this.filters.every(([key, operator, expected]) => {
      const actual = field(row.data, key, row.id);
      if (actual === undefined) return false;
      if (operator === '==') return isDeepStrictEqual(actual, expected);
      if (operator === 'in') return expected.some(value => isDeepStrictEqual(actual, value));
      const a = comparable(actual), b = comparable(expected);
      return operator === '<' ? a < b : operator === '<=' ? a <= b : operator === '>' ? a > b : a >= b;
    }));
    rows = rows.filter(row => this.orders.every(([key]) => field(row.data, key, row.id) !== undefined));
    rows.sort((a, b) => {
      for (const [key, direction] of this.orders) {
        const av = comparable(field(a.data, key, a.id));
        const bv = comparable(field(b.data, key, b.id));
        const diff = av < bv ? -1 : av > bv ? 1 : 0;
        if (diff) return direction === 'desc' ? -diff : diff;
      }
      return a.id.localeCompare(b.id);
    });
    const docs = rows.slice(0, this.max).map(row => new Snapshot(new Reference(this.db, this.name, row.id), row.data));
    return { docs, size: docs.length, empty: !docs.length, forEach: fn => docs.forEach(fn) };
  }
}
class Collection extends Query {
  doc(id = randomUUID()) { return new Reference(this.db, this.name, id); }
  async add(data) { const ref = this.doc(); await ref.set(data); return ref; }
}
class LocalDatabase {
  constructor(filename) {
    if (filename !== ':memory:') mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    this.sql = new DatabaseSync(filename);
    this.sql.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS documents (
        collection TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)),
        PRIMARY KEY(collection, id)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS unique_username ON documents(json_extract(data, '$.username'))
        WHERE collection = 'users';
      CREATE UNIQUE INDEX IF NOT EXISTS unique_phone ON documents(json_extract(data, '$.phone'))
        WHERE collection = 'users' AND json_extract(data, '$.phone') != '';
      PRAGMA user_version=1;`);
  }
  collection(name) { return new Collection(this, validName(name)); }
  read(collection, id) {
    const row = this.sql.prepare('SELECT data FROM documents WHERE collection = ? AND id = ?').get(collection, id);
    return row ? decode(JSON.parse(row.data)) : undefined;
  }
  write(ref, patch, mode) {
    const previous = this.read(ref.collection, ref.id);
    if (mode === 'update' && previous === undefined) throw new Error(`Document not found: ${ref.id}`);
    const result = mode === 'set' ? {} : (previous || {});
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (value instanceof ArrayUnion) {
        const existing = Array.isArray(result[key]) ? result[key] : [];
        result[key] = [...existing];
        for (const item of value.values) {
          if (!result[key].some(v => isDeepStrictEqual(v, item))) result[key].push(item);
        }
      } else {
        Object.defineProperty(result, key, { value, enumerable: true, writable: true, configurable: true });
      }
    }
    this.sql.prepare(`INSERT INTO documents(collection, id, data) VALUES (?, ?, ?)
      ON CONFLICT(collection, id) DO UPDATE SET data = excluded.data`).run(ref.collection, ref.id, JSON.stringify(encode(result)));
  }
  remove(collection, id) { this.sql.prepare('DELETE FROM documents WHERE collection = ? AND id = ?').run(collection, id); }
  atomic(fn) {
    this.sql.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.sql.exec('COMMIT'); return result; }
    catch (error) { this.sql.exec('ROLLBACK'); throw error; }
  }
  batch() {
    const operations = [];
    const batch = {
      set: (ref, data, opts = {}) => { operations.push(() => this.write(ref, data, opts.merge ? 'merge' : 'set')); return batch; },
      update: (ref, data) => { operations.push(() => this.write(ref, data, 'update')); return batch; },
      delete: ref => { operations.push(() => this.remove(ref.collection, ref.id)); return batch; },
      commit: async () => this.atomic(() => operations.forEach(fn => fn())),
    };
    return batch;
  }
  close() { this.sql.close(); }
}
module.exports = { LocalDatabase, Timestamp, FieldValue };
