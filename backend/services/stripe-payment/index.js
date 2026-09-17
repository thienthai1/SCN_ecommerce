const Stripe = require('stripe');

const DEFAULT_SHIPPING_CONFIG = {
  standard: { pricePerKg: 1 },
  premium: { pricePerKg: 2 }
};

function toSatang(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid monetary amount');
  return Math.round(amount * 100);
}

function publicAppUrl() {
  return (process.env.APP_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');
}

function safeFailureReason(paymentIntent) {
  const error = paymentIntent && paymentIntent.last_payment_error;
  return error ? (error.decline_code || error.code || 'payment_failed') : 'payment_failed';
}

async function resolveProduct(db, productId) {
  let snapshot = await db.collection('products').doc(productId).get();
  if (snapshot.exists) return { id: snapshot.id, data: snapshot.data(), suffix: '' };

  // Variant cart IDs are stored as "<product UUID>-<variant SKU>".
  if (typeof productId === 'string' && productId.length > 36) {
    const baseId = productId.slice(0, 36);
    snapshot = await db.collection('products').doc(baseId).get();
    if (snapshot.exists) return { id: snapshot.id, data: snapshot.data(), suffix: productId.slice(37) };
  }
  return null;
}

async function resolveCatalogItem(db, item) {
  const quantity = Number(item.quantity);
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('Order contains an invalid quantity');

  const product = await resolveProduct(db, item.product_id);
  if (!product || product.data.is_active === false) throw new Error('Order contains an unavailable product');

  let unitPrice = Number(product.data.price);
  let unitWeight = Number(product.data.weight || 0);
  let label = product.data.name || 'Product';

  if (product.data.isVariant === true || item.options || product.suffix) {
    const variants = await db.collection('product_variants').where('product_id', '==', product.id).get();
    const requestedSku = item.options && item.options.sku ? String(item.options.sku) : product.suffix;
    const requestedName = item.options && item.options.name ? String(item.options.name) : '';
    const requestedType = item.options && item.options.variant ? String(item.options.variant) : '';
    let selected;

    for (const variantDoc of variants.docs) {
      const variant = variantDoc.data() || {};
      if (requestedType && variant.variant !== requestedType) continue;
      selected = (variant.options || []).find(option =>
        (requestedSku && option.sku === requestedSku) || (!requestedSku && requestedName && option.name === requestedName)
      );
      if (selected) break;
    }

    if (!selected || selected.isActive === false) throw new Error('Order contains an unavailable product option');
    unitPrice = Number(selected.price);
    unitWeight = Number(selected.weight || product.data.weight || 0);
    label = `${label} - ${selected.name}`;
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('Product has an invalid price');
  if (!Number.isFinite(unitWeight) || unitWeight < 0) unitWeight = 0;

  return { name: label, quantity, unitAmount: toSatang(unitPrice), unitWeight };
}

async function calculateOrder(db, orderId) {
  const orderSnapshot = await db.collection('orders').doc(orderId).get();
  if (!orderSnapshot.exists) return null;
  const order = orderSnapshot.data();
  const itemSnapshot = await db.collection('order_items').where('order_id', '==', orderId).get();
  if (itemSnapshot.empty) throw new Error('Order has no items');

  const items = [];
  for (const itemDoc of itemSnapshot.docs) items.push(await resolveCatalogItem(db, itemDoc.data()));

  const configSnapshot = await db.collection('config').doc('shipping').get();
  const config = configSnapshot.exists ? configSnapshot.data() : DEFAULT_SHIPPING_CONFIG;
  const shipping = config[order.shipping_type || 'standard'];
  if (!shipping || !Number.isFinite(Number(shipping.pricePerKg))) throw new Error('Order has an invalid shipping type');

  const totalWeight = items.reduce((sum, item) => sum + item.unitWeight * item.quantity, 0);
  const chargeableWeight = Math.max(1, Math.ceil(totalWeight));
  const shippingAmount = toSatang(Number(shipping.pricePerKg) * chargeableWeight);
  const subtotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);

  return { order, items, shippingAmount, amount: subtotal + shippingAmount, currency: 'thb' };
}

function createStripeClient(secretKey = process.env.STRIPE_SECRET_KEY) {
  return secretKey ? new Stripe(secretKey) : null;
}

module.exports = function registerStripePaymentRoutes(app, opts = {}) {
  const { db, FieldValue, authenticate } = opts;
  const stripe = opts.stripe || createStripeClient();
  const webhookSecret = opts.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
  const payments = db.collection('payments');
  const webhookEvents = db.collection('stripe_webhook_events');

  function requireStripe(req, res, next) {
    if (!stripe) return res.status(503).json({ error: 'Stripe is not configured' });
    next();
  }

  async function ownedOrder(req, res) {
    const orderId = req.body && req.body.orderId ? req.body.orderId : req.params.orderId;
    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' });
      return null;
    }
    const snapshot = await db.collection('orders').doc(orderId).get();
    if (!snapshot.exists) {
      res.status(404).json({ error: 'Order not found' });
      return null;
    }
    const order = snapshot.data();
    if (order.user_id !== req.user.id) {
      res.status(403).json({ error: 'Forbidden' });
      return null;
    }
    return { id: snapshot.id, ref: snapshot.ref, data: order };
  }

  app.post('/payments/stripe/checkout-session', authenticate, requireStripe, async (req, res) => {
    try {
      const owned = await ownedOrder(req, res);
      if (!owned) return;
      if (owned.data.payment_status === 'paid' || owned.data.payment_status === 'refunded') {
        return res.status(409).json({ error: 'Order is already paid' });
      }

      const calculated = await calculateOrder(db, owned.id);
      const baseUrl = publicAppUrl();
      const lineItems = calculated.items.map(item => ({
        price_data: { currency: 'thb', product_data: { name: item.name }, unit_amount: item.unitAmount },
        quantity: item.quantity
      }));
      if (calculated.shippingAmount > 0) {
        lineItems.push({
          price_data: { currency: 'thb', product_data: { name: 'Shipping' }, unit_amount: calculated.shippingAmount },
          quantity: 1
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['promptpay'],
        line_items: lineItems,
        client_reference_id: owned.id,
        metadata: { order_id: owned.id },
        payment_intent_data: { metadata: { order_id: owned.id } },
        success_url: `${baseUrl}/payment/success?orderId=${encodeURIComponent(owned.id)}`,
        cancel_url: `${baseUrl}/payment/cancel?orderId=${encodeURIComponent(owned.id)}`
      }, { idempotencyKey: `checkout-${owned.id}` });

      const now = FieldValue.serverTimestamp();
      await payments.doc(owned.id).set({
        order_id: owned.id,
        provider: 'stripe',
        method: 'promptpay',
        checkout_session_id: session.id,
        payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        amount: calculated.amount,
        currency: calculated.currency,
        status: 'processing',
        processed_event_ids: [],
        created_at: now,
        updated_at: now
      }, { merge: true });
      await owned.ref.update({
        total_price: calculated.amount / 100,
        shipping_price: calculated.shippingAmount / 100,
        payment_status: 'processing',
        payment_provider: 'stripe',
        payment_method: 'promptpay',
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : null
      });

      return res.json({ checkoutUrl: session.url });
    } catch (error) {
      console.error('Stripe checkout session error:', error.message);
      return res.status(400).json({ error: error.message || 'Unable to create checkout session' });
    }
  });

  app.get('/payments/stripe/status/:orderId', authenticate, async (req, res) => {
    try {
      res.set("Cache-Control", "no-store");
      const owned = await ownedOrder(req, res);
      if (!owned) return;
      return res.json({ orderId: owned.id, paymentStatus: owned.data.payment_status || 'unpaid' });
    } catch (error) {
      console.error('Stripe payment status error:', error.message);
      return res.status(500).json({ error: 'Unable to read payment status' });
    }
  });

  app.post('/payments/stripe/webhook', async (req, res) => {
    if (!stripe || !webhookSecret) return res.status(503).send('Stripe webhook is not configured');
    const signature = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (error) {
      return res.status(400).send('Invalid Stripe webhook signature');
    }

    try {
      const seen = await webhookEvents.doc(event.id).get();
      if (seen.exists) return res.json({ received: true, duplicate: true });

      const object = event.data.object || {};
      let orderId = object.metadata && object.metadata.order_id;
      let paymentSnapshot = orderId ? await payments.doc(orderId).get() : null;
      if ((!paymentSnapshot || !paymentSnapshot.exists) && object.payment_intent) {
        const paymentIntentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent.id;
        const match = await payments.where('payment_intent_id', '==', paymentIntentId).limit(1).get();
        if (!match.empty) {
          paymentSnapshot = match.docs[0];
          orderId = paymentSnapshot.data().order_id;
        }
      }

      if (['payment_intent.succeeded', 'payment_intent.payment_failed', 'checkout.session.expired', 'charge.refunded'].includes(event.type)) {
        if (!orderId || !paymentSnapshot || !paymentSnapshot.exists) throw new Error('Payment record not found');
        const payment = paymentSnapshot.data();
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnapshot = await orderRef.get();
        if (!orderSnapshot.exists) throw new Error('Order not found');
        const updates = { updated_at: FieldValue.serverTimestamp(), processed_event_ids: FieldValue.arrayUnion(event.id) };
        const orderUpdates = {};

        if (event.type === 'payment_intent.succeeded') {
          if (object.currency !== payment.currency || object.amount_received !== payment.amount) throw new Error('Stripe amount or currency mismatch');
          updates.status = 'paid';
          updates.payment_intent_id = object.id;
          updates.paid_at = FieldValue.serverTimestamp();
          orderUpdates.payment_status = 'paid';
          orderUpdates.stripe_payment_intent_id = object.id;
          orderUpdates.paid_at = FieldValue.serverTimestamp();
        } else if (event.type === 'payment_intent.payment_failed') {
          if (object.currency !== payment.currency || object.amount !== payment.amount) throw new Error('Stripe amount or currency mismatch');
          updates.status = 'failed';
          updates.failure_reason = safeFailureReason(object);
          updates.payment_intent_id = object.id;
          orderUpdates.payment_status = 'failed';
          orderUpdates.stripe_payment_intent_id = object.id;
        } else if (event.type === 'checkout.session.expired') {
          if (payment.status !== 'paid') {
            updates.status = 'expired';
            orderUpdates.payment_status = 'expired';
          }
        } else if (event.type === 'charge.refunded') {
          if (object.currency !== payment.currency || object.amount !== payment.amount || object.amount_refunded > payment.amount) {
            throw new Error('Stripe amount or currency mismatch');
          }
          const refunded = object.amount_refunded === payment.amount ? 'refunded' : 'partially_refunded';
          updates.status = refunded;
          updates.amount_refunded = object.amount_refunded;
          orderUpdates.payment_status = refunded;
        }

        await paymentSnapshot.ref.update(updates);
        if (Object.keys(orderUpdates).length) await orderRef.update(orderUpdates);
      }

      await webhookEvents.doc(event.id).set({ type: event.type, processed_at: FieldValue.serverTimestamp() });
      return res.json({ received: true });
    } catch (error) {
      console.error('Stripe webhook processing error:', error.message);
      return res.status(400).send('Stripe webhook could not be processed');
    }
  });
};

module.exports.calculateOrder = calculateOrder;
module.exports.toSatang = toSatang;
