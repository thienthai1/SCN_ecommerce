const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');

const root = path.resolve(__dirname, '..');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const imageBase64 = `data:image/png;base64,${png.toString('base64')}`;

test('local API: accounts, admin, catalog, orders, files and scheduled jobs survive restart without cloud keys', { timeout: 45000 }, async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'scn-api-'));
  const env = { ...process.env, DATA_DIR: path.join(dir, 'data'), DATABASE_PATH: path.join(dir, 'data/shop.sqlite'),
    UPLOAD_DIR: path.join(dir, 'uploads'), PORT: '0', OMISE_SECRET_KEY: '', PUBLIC_API_URL: '', JWT_SECRET: '',
    ADMIN_USERNAME: 'test-admin', ADMIN_PASSWORD: 'isolated-test-password' };
  let child, base, logs = '';
  async function start() {
    logs = '';
    child = spawn(process.execPath, ['index.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', chunk => { logs += chunk; });
    child.stderr.on('data', chunk => { logs += chunk; });
    for (let i = 0; i < 100; i++) {
      const match = logs.match(/Server running on port (\d+)/);
      if (match) { base = `http://127.0.0.1:${match[1]}`; return; }
      if (child.exitCode !== null) throw new Error(logs);
      await delay(50);
    }
    throw new Error(`Startup timeout: ${logs}`);
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    const exited = once(child, 'exit');
    child.kill('SIGTERM');
    const timer = setTimeout(() => child.kill('SIGKILL'), 10000);
    try { await exited; } finally { clearTimeout(timer); }
  }
  async function api(url, { method = 'GET', body, token, status = 200 } = {}) {
    const response = await fetch(base + url, { method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    assert.equal(response.status, status, `${method} ${url}: ${text}\n${logs}`);
    return JSON.parse(text);
  }
  try {
    const created = spawnSync(process.execPath, ['scripts/create-admin.js'], { cwd: root, env, encoding: 'utf8' });
    assert.equal(created.status, 0, created.stderr);
    const duplicate = spawnSync(process.execPath, ['scripts/create-admin.js'], { cwd: root, env, encoding: 'utf8' });
    assert.equal(duplicate.status, 1);
    await start();
    assert.equal((await api('/health')).database, 'sqlite');
    const admin = (await api('/user/login', { method: 'POST', body: { username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD } })).token;
    assert.ok((await api('/user/profile/roles-permissions', { token: admin })).roles.some(r => r.name === 'admin'));
    const customer = await api('/user/register', { method: 'POST', status: 201, body: { username: 'customer', password: 'customer-password', name: 'Customer', phone: '0800000000' } });
    const token = (await api('/user/login', { method: 'POST', body: { username: 'customer', password: 'customer-password' } })).token;
    await api('/user/profile/roles-permissions', { token, status: 403 });
    await api('/addproducts', { method: 'POST', token, body: { name: 'No', sku: 'NO' }, status: 403 });
    const product = (await api('/addproducts', { method: 'POST', token: admin, status: 201, body: { name: 'Towel', sku: 'TOWEL-1', price: 100, stock: 10 } })).product;
    await api('/editproducts', { method: 'PUT', token: admin, body: { id: product.id, price: 120 } });
    const upload = await api('/uploadProductImage', { method: 'POST', token: admin, status: 201, body: { imageBase64, fileName: 'towel.png', product_id: product.id } });
    const imageUrl = upload.imageUrl || upload.image?.imageUrl || upload.product_image?.imageUrl;
    assert.ok(imageUrl, JSON.stringify(upload));
    assert.ok(imageUrl.startsWith('/uploads/'));
    const image = await fetch(base + imageUrl);
    assert.equal(image.status, 200);
    assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
    const category = (await api('/addcategories', { method: 'POST', token: admin, status: 201, body: { name: 'Bath', imageBase64, fileName: 'bath.png' } })).category;
    assert.ok(category.imageUrl.startsWith('/uploads/'));
    const bannerImage = await api('/banners/upload-image', { method: 'POST', token: admin, body: { imageBase64 } });
    await api('/banners', { method: 'POST', token: admin, status: 201, body: { title: 'Welcome', image_url: bannerImage.image_url } });
    assert.ok((await api('/banners')).banners[0].created_at);
    await api('/uploadPaymentGateway', { method: 'POST', token: admin, status: 201, body: { imageBase64, name: 'Bank transfer' } });
    await api('/getPaymentGateway', { token });
    const addr1 = await api('/user/addresses', { method: 'POST', token, status: 201, body: { name: 'Customer', phone: '0800000000', address: 'Address one' } });
    const addr2 = await api('/user/addresses', { method: 'POST', token, status: 201, body: { name: 'Customer', phone: '0800000000', address: 'Address two', is_default: true } });
    let addresses = (await api('/user/addresses', { token })).addresses;
    assert.equal(addresses.filter(a => a.is_default).length, 1);
    assert.equal(addresses[0].id, addr2.id);
    await api(`/user/addresses/${addr1.id}/default`, { method: 'PUT', token, body: {} });
    addresses = (await api('/user/addresses', { token })).addresses;
    assert.equal(addresses[0].id, addr1.id);
    const order = (await api('/addorders', { method: 'POST', token, status: 201, body: { user_id: customer.id, customer_name: 'Customer', total_price: 120, shipped_address: 'Address one' } })).order;
    await api('/addorderitems', { method: 'POST', token, status: 201, body: { order_id: order.id, product_id: product.id, price: 120, quantity: 1 } });
    await api('/uploadPaymentImage', { method: 'POST', token, status: 201, body: { order_id: order.id, imageBase64, fileName: 'proof.png' } });
    await api('/getorders', { token: admin });
    await api('/api/payments/omise/create', { method: 'POST', token, status: 503, body: {} });
    await api('/scheduler/jobs', { status: 401 });
    await api('/scheduler/create-job', { method: 'POST', token: admin, status: 400, body: { jobId: 'invalid', title: 'X', description: 'X', runAt: 'invalid' } });
    await api('/scheduler/create-job', { method: 'POST', token: admin, body: { jobId: 'cancelled', title: 'Cancel', description: 'Never send', runAt: new Date(Date.now() + 1000).toISOString() } });
    await api('/scheduler/delete-job/cancelled', { method: 'DELETE', token: admin });
    await api('/scheduler/create-job', { method: 'POST', token: admin, body: { jobId: 'durable', title: 'After restart', description: 'Persistent job', runAt: new Date(Date.now() + 1500).toISOString() } });
    await api('/scheduler/create-job', { method: 'POST', token: admin, body: { jobId: 'recurring', title: 'Recurring', description: 'Future', schedule: '0 0 1 1 *', timeZone: 'Asia/Bangkok' } });
    await stop();
    await delay(1600);
    await start();
    assert.equal((await api('/getproducts')).products[0].price, 120);
    assert.equal((await fetch(base + imageUrl)).status, 200);
    assert.equal((await api('/profile', { token })).id, customer.id); // Signing key survives restart.
    assert.equal((await api(`/getordersbyuser/${customer.id}`, { token })).orders.length, 1);
    await delay(1600);
    const notifications = await api('/notifications');
    assert.ok(JSON.stringify(notifications).includes('After restart'));
    assert.ok(!JSON.stringify(notifications).includes('Never send'));
    const jobs = (await api('/scheduler/jobs', { token: admin })).jobs;
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].name, 'local/jobs/recurring');
    await api(`/deleteproducts/${product.id}`, { method: 'DELETE', token: admin });
    assert.equal((await api('/getproducts')).products.length, 0);
  } finally { await stop(); rmSync(dir, { recursive: true, force: true }); }
});
