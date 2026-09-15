const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { LocalDatabase, Timestamp, FieldValue } = require('../lib/database');
const { createStorage } = require('../lib/storage');

test('SQLite persists nested timestamps, query filters, ordering, union and transactional batches', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'scn-db-'));
  const filename = path.join(dir, 'shop.sqlite');
  let db = new LocalDatabase(filename);
  try {
    await db.collection('rows').doc('one').set({ active: true, created: new Timestamp(1000), nested: [{ at: new Timestamp(2000) }], tags: ['a'] });
    await db.collection('rows').doc('two').set({ active: false, created: new Timestamp(3000) });
    await db.collection('rows').doc('one').update({ tags: FieldValue.arrayUnion('a', 'b'), active: false });
    await db.collection('rows').doc('one').set({ extra: 4 }, { merge: true });
    const rows = await db.collection('rows').where('active', '==', false).orderBy('created', 'desc').get();
    assert.deepEqual(rows.docs.map(d => d.id), ['two', 'one']);
    assert.deepEqual((await rows.docs[1].ref.get()).data().tags, ['a', 'b']);
    assert.equal((await db.collection('rows').where('__name__', 'in', ['one']).limit(1).get()).size, 1);
    assert.equal((await db.collection('rows').where('created', '<=', new Timestamp(2000)).get()).size, 1);
    const failedBatch = db.batch();
    failedBatch.update(db.collection('rows').doc('one'), { extra: 999 });
    failedBatch.update(db.collection('rows').doc('missing'), { extra: 2 });
    await assert.rejects(failedBatch.commit(), /not found/);
    assert.equal((await db.collection('rows').doc('one').get()).data().extra, 4);
    const batch = db.batch();
    batch.update(db.collection('rows').doc('one'), { active: true });
    batch.delete(db.collection('rows').doc('two'));
    await batch.commit();
    db.close(); db = new LocalDatabase(filename);
    const row = (await db.collection('rows').doc('one').get()).data();
    assert.equal(row.nested[0].at.toDate().toISOString(), '1970-01-01T00:00:02.000Z');
    assert.equal(row.active, true);
    assert.equal((await db.collection('rows').get()).size, 1);
    await db.collection('users').doc('u1').set({ username: 'same', phone: '123' });
    await assert.rejects(db.collection('users').doc('u2').set({ username: 'same' }), /UNIQUE/);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('uploads reject traversal, executable content and overwrites', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'scn-storage-'));
  try {
    const storage = createStorage(dir);
    for (const name of ['../secret', '/tmp/secret', 'a/../../secret', 'a\\secret', '.env']) {
      assert.throws(() => storage.file(name), /path/);
    }
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    await assert.rejects(storage.file('x.html').save(png), /extension/);
    await assert.rejects(storage.file('x.svg').save(Buffer.from('<svg/>')), /supported/);
    const file = storage.file('images/x.png');
    await file.save(png);
    await assert.rejects(file.save(png), /EEXIST/);
    await file.delete();
    await file.delete();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
