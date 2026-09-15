// Omise payment routes for PromptPay
module.exports = function registerOmisePaymentRoutes(app, opts = {}) {
  const Omise = require('omise');
  const { db, FieldValue } = opts;

  const omise = process.env.OMISE_SECRET_KEY ? Omise({ secretKey: process.env.OMISE_SECRET_KEY }) : null;
  app.use('/api/payments/omise', (req, res, next) => {
    if (!omise) return res.status(503).json({ error: 'Omise is not configured. Set OMISE_SECRET_KEY to enable online payments.' });
    next();
  });

  // Create a PromptPay charge/source
  app.post('/api/payments/omise/create', async (req, res) => {
    try {
      const { amount, orderId, return_uri } = req.body || {};
      if (!amount || !orderId) return res.status(400).json({ error: 'amount and orderId are required' });

      // Expect amount in satang (smallest unit). If user passed THB as float, they should multiply by 100.
      const charge = await omise.charges.create({
        amount,
        currency: 'thb',
        description: `Order ${orderId}`,
        return_uri: return_uri || undefined,
        source: { type: 'promptpay' }
      });

      // Persist minimal payment record
      try {
        await db.collection('payments').add({
          orderId,
          chargeId: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          source: charge.source || null,
          raw: charge,
          createdAt: FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.error('Failed to persist payment record', e);
      }

      return res.json({ success: true, charge });
    } catch (err) {
      console.error('Error creating Omise charge', err);
      return res.status(500).json({ success: false, error: err && err.message ? err.message : String(err) });
    }
  });

  // Retrieve charge status
  app.get('/api/payments/omise/status', async (req, res) => {
    try {
      const chargeId = req.query.chargeId || req.query.id;
      if (!chargeId) return res.status(400).json({ error: 'chargeId is required' });
      const charge = await omise.charges.retrieve(chargeId);
      return res.json({ success: true, charge });
    } catch (err) {
      console.error('Error retrieving Omise charge', err);
      return res.status(500).json({ success: false, error: err && err.message ? err.message : String(err) });
    }
  });

  // Retrieve QR image (binary) by chargeId
  app.get('/api/payments/omise/qr/:chargeId', async (req, res) => {
    try {
      const chargeId = req.params.chargeId || req.query.chargeId;
      if (!chargeId) return res.status(400).json({ error: 'chargeId is required' });

      const charge = await omise.charges.retrieve(chargeId);
      if (!charge) return res.status(404).json({ error: 'Charge not found' });

      // Try common locations for PromptPay scannable image/data
        const qrImageUrl = charge.source.scannable_code.image.download_uri;
        if (!qrImageUrl) {
          return res.status(404).json({ error: 'QR image not found in charge source' });
        }

        // Return the QR image URL
        return res.json({ success: true, qrImageUrl });
    } catch (err) {
      console.error('Error in QR endpoint', err);
      return res.status(500).json({ error: err && err.message ? err.message : String(err) });
    }
  });

  // Webhook endpoint to receive Omise events
  // Omise recommends verifying events by retrieving the event via the API
  app.post('/api/payments/omise/webhook', async (req, res) => {
    try {

      const obj = req.body;

    //  Handle charge events
      if (obj.object === 'charge') {
        const charge = obj;
        try {
          console.log('update payment status')
          const snap = await db.collection('payments').where('chargeId', '==', charge.id).limit(1).get();
          console.log('found payment record', snap);
          if (!snap.empty) {
            await snap.docs[0].ref.update({
              status: charge.status,
              source: charge.source || null,
              raw: charge,
              updatedAt: FieldValue.serverTimestamp()
            });
          } else {
            // If no existing record, create one for traceability
            await db.collection('payments').add({
              orderId: null,
              chargeId: charge.id,
              amount: charge.amount,
              currency: charge.currency,
              status: charge.status,
              source: charge.source || null,
              raw: charge,
              createdAt: FieldValue.serverTimestamp()
            });
          }

          // If charge is successful, you may update order status here (customize as needed)
          if (charge.paid === true || charge.status === 'successful') {
            console.log('charge paid - update order status');
            // Try to find an order linked to this charge and mark it paid
            try {
              const paymentsSnap = await db.collection('payments').where('chargeId', '==', charge.id).limit(1).get();
              if (!paymentsSnap.empty) {
                await paymentsSnap.docs[0].ref.update({
                    status: charge.status,
                    source: charge.source || null,
                    raw: charge,
                    updatedAt: FieldValue.serverTimestamp(),
                    payment_status: 'paid',
                    paid_at: FieldValue.serverTimestamp()
                });
                
              }
            } catch (e) {
              console.warn('Unable to update order payment status automatically', e);
            }
          }
        } catch (e) {
          console.error('Error updating payment record for charge', e);
        }
      }

      return res.status(200).send('OK');
    } catch (err) {
      console.error('Omise webhook processing error', err);
      return res.status(500).send('Error');
    }
  });
};
