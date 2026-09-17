const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const { LocalDatabase, FieldValue } = require('../lib/database');
const registerStripePaymentRoutes = require('../services/stripe-payment');

test('Stripe checkout uses catalog prices and signed webhook controls payment status', async () => {
  const db = new LocalDatabase(':memory:');
  const app = express();
  app.use('/payments/stripe/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());

  let createArgs;
  let createOptions;
  let nextEvent;
  const stripe = {
    checkout: { sessions: { create: async (args, options) => {
      createArgs = args;
      createOptions = options;
      return { id: 'cs_test_order', payment_intent: 'pi_test_order', url: 'https://checkout.stripe.test/session' };
    } } },
    webhooks: { constructEvent: body => {
      assert.ok(Buffer.isBuffer(body));
      if (nextEvent instanceof Error) throw nextEvent;
      return nextEvent;
    } }
  };
  const authenticate = (req, res, next) => {
    if (!req.headers['x-user']) return res.status(401).json({ error: 'Missing user' });
    req.user = { id: req.headers['x-user'] };
    next();
  };
  registerStripePaymentRoutes(app, { db, FieldValue, authenticate, stripe, webhookSecret: 'whsec_test' });

  await db.collection('products').doc('product-one').set({ name: 'Towel', price: 125, weight: 0.6, is_active: true });
  await db.collection('orders').doc('order-one').set({ user_id: 'user-one', shipping_type: 'standard', total_price: 1, payment_status: 'unpaid' });
  await db.collection('order_items').doc('item-one').set({ order_id: 'order-one', product_id: 'product-one', price: 1, quantity: 2 });
  await db.collection('config').doc('shipping').set({ standard: { pricePerKg: 10 } });

  const server = app.listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { method = 'GET', user, body, status = 200 } = {}) {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(user ? { 'x-user': user } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    assert.equal(response.status, status, `${method} ${path}: ${text}`);
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  }

  try {
    await request('/payments/stripe/checkout-session', { method: 'POST', user: 'other-user', body: { orderId: 'order-one' }, status: 403 });
    const checkout = await request('/payments/stripe/checkout-session', { method: 'POST', user: 'user-one', body: { orderId: 'order-one' } });
    assert.equal(checkout.checkoutUrl, 'https://checkout.stripe.test/session');
    assert.equal(createOptions.idempotencyKey, 'checkout-order-one');
    assert.equal(createArgs.payment_method_types[0], 'promptpay');
    assert.equal(createArgs.line_items[0].price_data.unit_amount, 12500);
    assert.equal(createArgs.line_items[0].quantity, 2);
    assert.equal(createArgs.line_items[1].price_data.unit_amount, 2000); // ceil(1.2kg) * 10 THB

    const payment = (await db.collection('payments').doc('order-one').get()).data();
    assert.equal(payment.amount, 27000);
    assert.equal((await db.collection('orders').doc('order-one').get()).data().total_price, 270);

    nextEvent = { id: 'evt_paid', type: 'payment_intent.succeeded', data: { object: {
      id: 'pi_test_order', amount_received: 27000, currency: 'thb', metadata: { order_id: 'order-one' }
    } } };
    await request('/payments/stripe/webhook', { method: 'POST', body: {} });
    assert.equal((await db.collection('orders').doc('order-one').get()).data().payment_status, 'paid');
    assert.equal((await request('/payments/stripe/status/order-one', { user: 'user-one' })).paymentStatus, 'paid');

    const duplicate = await request('/payments/stripe/webhook', { method: 'POST', body: {} });
    assert.equal(duplicate.duplicate, true);

    nextEvent = { id: 'evt_bad_amount', type: 'payment_intent.succeeded', data: { object: {
      id: 'pi_test_order', amount_received: 1, currency: 'thb', metadata: { order_id: 'order-one' }
    } } };
    await request('/payments/stripe/webhook', { method: 'POST', body: {}, status: 400 });
    assert.equal((await db.collection('orders').doc('order-one').get()).data().payment_status, 'paid');

    nextEvent = new Error('bad signature');
    await request('/payments/stripe/webhook', { method: 'POST', body: {}, status: 400 });
  } finally {
    server.close();
    await once(server, 'close');
    db.close();
  }
});
