module.exports = function registerMarketplaceRoutes(app, deps = {}) {
  
  if (!app) throw new Error('registerMarketplaceRoutes requires express app');
  const { db, Timestamp, UUID, bucket, authenticate, ensureAdmin, FieldValue } = deps;
  const webpush = require('web-push');

  // POST /addproducts - create a new product
  app.post('/addproducts', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const {
        id,
        name,
        description,
        category_name,
        price,
        stock,
        sku,
        is_active,
        imageUrl,
        isVariant
      } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'name is required' });
      }

      if (!sku) {
        return res.status(400).json({ error: 'sku is required' });
      }

      // Check SKU uniqueness
      const existingProductsSnap = await db.collection('products').where('sku', '==', sku).get();
      if (!existingProductsSnap.empty) {
        return res.status(400).json({ error: `SKU '${sku}' already exists` });
      }

      const productId = id || (UUID ? UUID() : undefined);

      const product = {
        id: productId,
        name,
        description: description || '',
        category_name: category_name || '',
        price: Number(price),
        stock: typeof stock === 'number' ? stock : (stock ? Number(stock) : 0),
        sku,
        is_active: typeof is_active === 'boolean' ? is_active : true,
        imageUrl: imageUrl || '',
        isVariant: typeof isVariant === 'boolean' ? isVariant : false,
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      if (productId) {
        await db.collection('products').doc(productId).set(product);
      } else {
        const docRef = await db.collection('products').add(product);
        product.id = docRef.id;
      }

      // Return created product (normalize created_at)
      const created = Object.assign({}, product);
      if (created.created_at && typeof created.created_at.toDate === 'function') {
        created.created_at = created.created_at.toDate().toISOString();
      } else if (created.created_at instanceof Date) {
        created.created_at = created.created_at.toISOString();
      }

      res.status(201).json({ message: 'Product created', product: created });
    } catch (err) {
      console.error('Error creating product:', err);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  // PUT /editproducts - update an existing product
  app.put('/editproducts', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id, name, description, category_name, price, stock, sku, is_active, imageUrl, weight, isVariant } = req.body;
      if (!id) return res.status(400).json({ error: 'Product id is required' });

      const docRef = db.collection('products').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) return res.status(404).json({ error: 'Product not found' });

      // If updating SKU, check uniqueness
      if (sku !== undefined) {
        const existingSnap = await db.collection('products').where('sku', '==', sku).get();
        const otherWithSku = existingSnap.docs.find(doc => doc.id !== id);
        if (otherWithSku) {
          return res.status(400).json({ error: `SKU '${sku}' already exists` });
        }
      }

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (price !== undefined) updates.price = Number(price);
      if (stock !== undefined) updates.stock = typeof stock === 'number' ? stock : Number(stock);
      if (sku !== undefined) updates.sku = sku;
      if (weight !== undefined) updates.weight = Number(weight);
      if (is_active !== undefined) updates.is_active = typeof is_active === 'boolean' ? is_active : (is_active === 'false' ? false : Boolean(is_active));
      if (isVariant !== undefined) updates.isVariant = typeof isVariant === 'boolean' ? isVariant : Boolean(isVariant);
      if (imageUrl !== undefined) updates.imageUrl = imageUrl;
      if (category_name !== undefined) updates.category_name = category_name;
      updates.updated_at = Timestamp ? Timestamp.now() : new Date();

      await docRef.update(updates);

      const updatedSnap = await docRef.get();
      const updated = updatedSnap.data();
      updated.id = updatedSnap.id;

      if (updated.created_at && typeof updated.created_at.toDate === 'function') {
        updated.created_at = updated.created_at.toDate().toISOString();
      } else if (updated.created_at instanceof Date) {
        updated.created_at = updated.created_at.toISOString();
      }
      if (updated.updated_at && typeof updated.updated_at.toDate === 'function') {
        updated.updated_at = updated.updated_at.toDate().toISOString();
      } else if (updated.updated_at instanceof Date) {
        updated.updated_at = updated.updated_at.toISOString();
      }

      res.json({ message: 'Product updated', product: updated });
    } catch (err) {
      console.error('Error updating product:', err);
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  // GET /getproducts - fetch all products (with variants if isVariant is true)
  app.get('/getproducts', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const snapshot = await db.collection('products').get();
      const products = [];

      for (const doc of snapshot.docs) {
        const data = doc.data() || {};
        data.id = doc.id;
        if (data.created_at && typeof data.created_at.toDate === 'function') {
          data.created_at = data.created_at.toDate().toISOString();
        } else if (data.created_at instanceof Date) {
          data.created_at = data.created_at.toISOString();
        }

        // If product has variants, fetch them
        if (data.isVariant === true) {
          const variantsSnap = await db.collection('product_variants')
            .where('product_id', '==', doc.id)
            .get();

          const variants = variantsSnap.docs.map(vDoc => {
            const vData = vDoc.data() || {};
            vData.id = vDoc.id;
            // Convert timestamps in options
            if (vData.options && Array.isArray(vData.options)) {
              vData.options = vData.options.map(opt => {
                const optCopy = { ...opt };
                if (optCopy.created_time && typeof optCopy.created_time.toDate === 'function') {
                  optCopy.created_time = optCopy.created_time.toDate().toISOString();
                } else if (optCopy.created_time instanceof Date) {
                  optCopy.created_time = optCopy.created_time.toISOString();
                }
                return optCopy;
              });
            }
            return vData;
          });

          data.variants = variants;
        }

        products.push(data);
      }

      res.json({ products });
    } catch (err) {
      console.error('Error fetching products:', err);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  // DELETE /deleteproducts/:id - delete a product by id
  app.delete('/deleteproducts/:id', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Product id is required' });

      const docRef = db.collection('products').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) return res.status(404).json({ error: 'Product not found' });

      await docRef.delete();

      res.json({ message: 'Product deleted', id });
    } catch (err) {
      console.error('Error deleting product:', err);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // POST /addorders - create a new order
  app.post('/addorders', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const {
        id,
        order_token,
        customer_name,
        customer_phone,
        status,
        total_price,
        shipped_address,
        shipping_type,
        shipping_price,
        user_id,
        user_email
      } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'user_id is required. Please sign in to place an order.' });
      }

      if (!customer_name || total_price === undefined) {
        return res.status(400).json({ error: 'customer_name and total_price are required' });
      }

      // Generate or use provided order_token, ensure uniqueness
      let finalOrderToken = order_token;
      if (!finalOrderToken) {
        // Generate a unique order token
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        finalOrderToken = `ORD-${timestamp}-${random}`;
      }

      // Check if order_token already exists
      const existingOrder = await db.collection('orders')
        .where('order_token', '==', finalOrderToken)
        .limit(1)
        .get();

      if (!existingOrder.empty) {
        // Token exists, generate a new unique one
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 10).toUpperCase();
        finalOrderToken = `ORD-${timestamp}-${random}`;
      }

      const orderId = id || (UUID ? UUID() : undefined);

      const order = {
        id: orderId,
        order_token: finalOrderToken,
        customer_name,
        customer_phone: customer_phone || '',
        status: status || 'pending',
        total_price: Number(total_price),
        shipped_address: shipped_address || '',
        shipping_type: shipping_type || '',
        shipping_price: shipping_price !== undefined ? Number(shipping_price) : 0,
        user_id: user_id,
        user_email: user_email || '',
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      if (orderId) {
        await db.collection('orders').doc(orderId).set(order);
      } else {
        const docRef = await db.collection('orders').add(order);
        order.id = docRef.id;
      }

      const created = Object.assign({}, order);
      if (created.created_at && typeof created.created_at.toDate === 'function') {
        created.created_at = created.created_at.toDate().toISOString();
      } else if (created.created_at instanceof Date) {
        created.created_at = created.created_at.toISOString();
      }

      // Notify admin subscribers about the new order
      (async () => {
        try {
          const notificationTitle = `New order from ${customer_name}`;
          const notificationBody = 'Please review the new order.';
          const payload = JSON.stringify({ title: notificationTitle, body: notificationBody, openUrl: '/#/' });

          // Find admin user documents (username === 'admin')
          const adminUsersSnap = await db.collection('users').where('username', '==', 'admin').get();
          const endpoints = new Map();

          for (const adminDoc of adminUsersSnap.docs) {
            const adminData = adminDoc.data() || {};
            // collect from user's notification_subscriptions array
            if (Array.isArray(adminData.notification_subscriptions)) {
              for (const s of adminData.notification_subscriptions) {
                if (s && s.endpoint && !endpoints.has(s.endpoint)) endpoints.set(s.endpoint, s.keys || {});
              }
            }

            // fallback: collect from global subscriptions collection
            try {
              const subsSnap = await db.collection('subscriptions').where('user_id', '==', adminDoc.id).get();
              subsSnap.forEach(sd => {
                const sdData = sd.data() || {};
                if (sdData.endpoint && !endpoints.has(sdData.endpoint)) endpoints.set(sdData.endpoint, sdData.keys || { p256dh: sdData['keys[p256dh]'], auth: sdData['keys[auth]'] });
              });
            } catch (e) {
              console.error('Error fetching admin fallback subscriptions:', e);
            }
          }

          const uniqueSubs = Array.from(endpoints.entries()).map(([endpoint, keys]) => ({ endpoint, keys }));
          if (uniqueSubs.length > 0) {
            await Promise.all(uniqueSubs.map(async s => {
              const pushSubscription = { endpoint: s.endpoint, keys: { auth: (s.keys && s.keys.auth) || s['keys[auth]'], p256dh: (s.keys && s.keys.p256dh) || s['keys[p256dh]'] } };
              try {
                await webpush.sendNotification(pushSubscription, payload);
              } catch (err) {
                console.error('Failed to send admin notification to', s.endpoint, err && err.message ? err.message : err);
              }
            }));

            // record notification in notifications collection
            try {
              await db.collection('notifications').add({ title: notificationTitle, description: notificationBody, date: Timestamp.now(), meta: { order_id: order.id, notified_admin_count: uniqueSubs.length } });
            } catch (e) {
              console.error('Failed to record admin notification:', e);
            }
          }
        } catch (err) {
          console.error('Error notifying admins of new order:', err);
        }
      })();

      res.status(201).json({ message: 'Order created', order: created });
    } catch (err) {
      console.error('Error creating order:', err);
      res.status(500).json({ error: 'Failed to create order' });
    }
  });

  // DELETE /deleteorders/:id - delete an order by id
  app.delete('/deleteorders/:id', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Order id is required' });

      const docRef = db.collection('orders').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) return res.status(404).json({ error: 'Order not found' });

      await docRef.delete();

      res.json({ message: 'Order deleted', id });
    } catch (err) {
      console.error('Error deleting order:', err);
      res.status(500).json({ error: 'Failed to delete order' });
    }
  });

  // GET /getordersbyuser/:user_id - get all orders for a specific user
  app.get('/getordersbyuser/:user_id', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { user_id } = req.params;
      if (!user_id) return res.status(400).json({ error: 'user_id is required' });

      // Query orders by user_id, ordered by created_at descending
      const ordersSnapshot = await db.collection('orders')
        .where('user_id', '==', user_id)
        .orderBy('created_at', 'desc')
        .get();

      const orders = [];
      for (const doc of ordersSnapshot.docs) {
        const orderData = doc.data();
        
        // Convert SQLite Timestamp to ISO string
        if (orderData.created_at && typeof orderData.created_at.toDate === 'function') {
          orderData.created_at = orderData.created_at.toDate().toISOString();
        }

        // Fetch order items for this order
        const orderItemsSnapshot = await db.collection('order_items')
          .where('order_id', '==', doc.id)
          .get();

        const orderItems = [];
        for (const itemDoc of orderItemsSnapshot.docs) {
          const itemData = itemDoc.data();

          // Normalize created_at on item
          if (itemData.created_at && typeof itemData.created_at.toDate === 'function') {
            itemData.created_at = itemData.created_at.toDate().toISOString();
          }

          // Fetch product details for each order item and include full product data
          if (itemData.product_id) {
            try {
              let productDoc = await db.collection('products').doc(itemData.product_id).get();
              
              // If not found and product_id looks like a variant ID (UUID + suffix), try base UUID
              if (!productDoc.exists && itemData.product_id.length > 36) {
                const baseProductId = itemData.product_id.substring(0, 36);
                productDoc = await db.collection('products').doc(baseProductId).get();
              }

              if (productDoc.exists) {
                const productData = productDoc.data() || {};
                productData.id = productDoc.id;

                // Normalize timestamps on product
                if (productData.created_at && typeof productData.created_at.toDate === 'function') {
                  productData.created_at = productData.created_at.toDate().toISOString();
                } else if (productData.created_at instanceof Date) {
                  productData.created_at = productData.created_at.toISOString();
                }
                if (productData.updated_at && typeof productData.updated_at.toDate === 'function') {
                  productData.updated_at = productData.updated_at.toDate().toISOString();
                } else if (productData.updated_at instanceof Date) {
                  productData.updated_at = productData.updated_at.toISOString();
                }

                // Attach a minimal product preview to the order item for display
                itemData.product = productData;
                itemData.product_name = productData.name || itemData.product_name;
                itemData.product_imageUrl = productData.imageUrl || itemData.product_imageUrl;
                itemData.product_category = productData.category_name || itemData.product_category;
              }
            } catch (err) {
              console.error('Error fetching product:', err);
            }
          }

          orderItems.push(itemData);
        }

        orderData.order_items = orderItems;

        // Fetch slipped images for this order
        const imgsSnap = await db.collection('slipped_image').where('order_id', '==', doc.id).get();
        const imgs = imgsSnap.docs.map(d => {
          const im = d.data() || {};
          im.id = d.id;
          if (im.created_at && typeof im.created_at.toDate === 'function') {
            im.created_at = im.created_at.toDate().toISOString();
          } else if (im.created_at instanceof Date) {
            im.created_at = im.created_at.toISOString();
          }
          return im;
        });
        orderData.slipped_images = imgs;

        orders.push(orderData);
      }

      res.json({ orders });
    } catch (err) {
      console.error('Error fetching orders by user:', err);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // POST /addorderitems - create a new order item
  app.post('/addorderitems', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id, order_id, product_id, price, quantity, options } = req.body;

      if (!order_id || !product_id || quantity === undefined) {
        return res.status(400).json({ error: 'order_id, product_id and quantity are required' });
      }

      const itemId = id || (UUID ? UUID() : undefined);

      const item = {
        id: itemId,
        order_id,
        product_id,
        price: price !== undefined ? Number(price) : 0,
        quantity: typeof quantity === 'number' ? quantity : Number(quantity),
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      // Only add options if it exists and is an object
      if (options && typeof options === 'object') {
        item.options = options;
      }

      if (itemId) {
        await db.collection('order_items').doc(itemId).set(item);
      } else {
        const docRef = await db.collection('order_items').add(item);
        item.id = docRef.id;
      }

      const created = Object.assign({}, item);
      if (created.created_at && typeof created.created_at.toDate === 'function') {
        created.created_at = created.created_at.toDate().toISOString();
      } else if (created.created_at instanceof Date) {
        created.created_at = created.created_at.toISOString();
      }

      res.status(201).json({ message: 'Order item created', order_item: created });
    } catch (err) {
      console.error('Error creating order item:', err);
      res.status(500).json({ error: 'Failed to create order item' });
    }
  });

  // POST /addslippedImage - create a slipped image for an order
  app.post('/addslippedImage', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id, order_id, imageUrl } = req.body;

      if (!order_id || !imageUrl) {
        return res.status(400).json({ error: 'order_id and imageUrl are required' });
      }

      const itemId = id || (UUID ? UUID() : undefined);
      const slipped = {
        id: itemId,
        order_id,
        imageUrl,
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      if (itemId) {
        await db.collection('slipped_image').doc(itemId).set(slipped);
      } else {
        const docRef = await db.collection('slipped_image').add(slipped);
        slipped.id = docRef.id;
      }

      const created = Object.assign({}, slipped);
      if (created.created_at && typeof created.created_at.toDate === 'function') {
        created.created_at = created.created_at.toDate().toISOString();
      } else if (created.created_at instanceof Date) {
        created.created_at = created.created_at.toISOString();
      }

      res.status(201).json({ message: 'Slipped image created', slipped_image: created });
    } catch (err) {
      console.error('Error creating slipped image:', err);
      res.status(500).json({ error: 'Failed to create slipped image' });
    }
  });

  // GET /getorders - fetch all orders with their order_items and slipped_images
  app.get('/getorders', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const ordersSnap = await db.collection('orders').get();
      const orders = [];

      for (const doc of ordersSnap.docs) {
        const o = doc.data() || {};
        o.id = doc.id;

        if (o.created_at && typeof o.created_at.toDate === 'function') {
          o.created_at = o.created_at.toDate().toISOString();
        } else if (o.created_at instanceof Date) {
          o.created_at = o.created_at.toISOString();
        }

        // fetch order items for this order
        const itemsSnap = await db.collection('order_items').where('order_id', '==', doc.id).get();
        const items = [];
        for (const d of itemsSnap.docs) {
          const it = d.data() || {};
          it.id = d.id;
          if (it.created_at && typeof it.created_at.toDate === 'function') {
            it.created_at = it.created_at.toDate().toISOString();
          } else if (it.created_at instanceof Date) {
            it.created_at = it.created_at.toISOString();
          }
          // Fetch product details for this item
          if (it.product_id) {
            let prodSnap = await db.collection('products').doc(it.product_id).get();
            
            // If not found and product_id looks like a variant ID (UUID + suffix), try base UUID
            if (!prodSnap.exists && it.product_id.length > 36) {
              const baseProductId = it.product_id.substring(0, 36);
              prodSnap = await db.collection('products').doc(baseProductId).get();
            }

            if (prodSnap.exists) {
              const prodData = prodSnap.data();
              it.product = prodData;
              it.product.id = prodSnap.id;
              it.product_name = prodData.name || '';
              it.product_category = prodData.category_name || '';
              it.product_imageUrl = prodData.imageUrl || '';
            }
          }
          items.push(it);
        }

        // fetch slipped images for this order
        const imgsSnap = await db.collection('slipped_image').where('order_id', '==', doc.id).get();
        const imgs = imgsSnap.docs.map(d => {
          const im = d.data() || {};
          im.id = d.id;
          if (im.created_at && typeof im.created_at.toDate === 'function') {
            im.created_at = im.created_at.toDate().toISOString();
          } else if (im.created_at instanceof Date) {
            im.created_at = im.created_at.toISOString();
          }
          return im;
        });

        o.order_items = items;
        o.slipped_images = imgs;

        orders.push(o);
      }

      res.json({ orders });
    } catch (err) {
      console.error('Error fetching orders:', err);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // GET /getorder/:order_token - fetch a single order by order_token with its order_items and slipped_images
  app.get('/getorder/:order_token', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { order_token } = req.params;
      if (!order_token) {
        return res.status(400).json({ error: 'order_token is required' });
      }

      // Find order by order_token
      const ordersSnap = await db.collection('orders')
        .where('order_token', '==', order_token)
        .limit(1)
        .get();

      if (ordersSnap.empty) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const doc = ordersSnap.docs[0];
      const order = doc.data() || {};
      order.id = doc.id;

      if (order.created_at && typeof order.created_at.toDate === 'function') {
        order.created_at = order.created_at.toDate().toISOString();
      } else if (order.created_at instanceof Date) {
        order.created_at = order.created_at.toISOString();
      }

      // Fetch order items for this order
      const itemsSnap = await db.collection('order_items').where('order_id', '==', doc.id).get();
      const items = [];
      for (const d of itemsSnap.docs) {
        const it = d.data() || {};
        it.id = d.id;
        if (it.created_at && typeof it.created_at.toDate === 'function') {
          it.created_at = it.created_at.toDate().toISOString();
        } else if (it.created_at instanceof Date) {
          it.created_at = it.created_at.toISOString();
        }
        // Fetch product details for this item
        if (it.product_id) {
          let prodSnap = await db.collection('products').doc(it.product_id).get();
          
          // If not found and product_id looks like a variant ID (UUID + suffix), try base UUID
          if (!prodSnap.exists && it.product_id.length > 36) {
            const baseProductId = it.product_id.substring(0, 36);
            prodSnap = await db.collection('products').doc(baseProductId).get();
          }

          if (prodSnap.exists) {
            const prodData = prodSnap.data();
            it.product = prodData;
            it.product.id = prodSnap.id;
            it.product_name = prodData.name || '';
            it.product_category = prodData.category_name || '';
            it.product_imageUrl = prodData.imageUrl || '';
          }
        }
        items.push(it);
      }

      // Fetch slipped images for this order
      const imgsSnap = await db.collection('slipped_image').where('order_id', '==', doc.id).get();
      const imgs = imgsSnap.docs.map(d => {
        const im = d.data() || {};
        im.id = d.id;
        if (im.created_at && typeof im.created_at.toDate === 'function') {
          im.created_at = im.created_at.toDate().toISOString();
        } else if (im.created_at instanceof Date) {
          im.created_at = im.created_at.toISOString();
        }
        return im;
      });

      order.order_items = items;
      order.slipped_images = imgs;

      res.json({ order });
    } catch (err) {
      console.error('Error fetching order by token:', err);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  });

  // POST /uploadPaymentImage - upload payment proof image to local storage
  app.post('/uploadPaymentImage', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });
      if (!bucket) return res.status(500).json({ error: 'Storage not initialized' });

      const { order_id, imageBase64, fileName } = req.body;

      if (!order_id || !imageBase64) {
        return res.status(400).json({ error: 'order_id and imageBase64 are required' });
      }

      // Validate order exists
      const orderDoc = await db.collection('orders').doc(order_id).get();
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Extract base64 data (remove data:image/xxx;base64, prefix if present)
      let base64Data = imageBase64;
      let mimeType = 'image/png';
      
      if (imageBase64.includes(';base64,')) {
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique file name
      const fileExtension = mimeType.split('/')[1] || 'png';
      const uniqueFileName = `${UUID()}_${fileName || `payment_${order_id}_${Date.now()}.${fileExtension}`}`;
      const filePath = `payment_proofs/${order_id}/${uniqueFileName}`;

      // Upload to local storage
      const file = bucket.file(filePath);
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            order_id: order_id,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      // Make the file publicly accessible


      // Get public URL
      const publicUrl = file.publicUrl();

      // Save tracking info to SQLite
      const paymentImageId = UUID ? UUID() : undefined;
      const paymentImage = {
        id: paymentImageId,
        order_id,
        fileName: uniqueFileName,
        filePath,
        imageUrl: publicUrl,
        mimeType,
        status: 'pending_verification',
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      if (paymentImageId) {
        await db.collection('payment_images').doc(paymentImageId).set(paymentImage);
      } else {
        const docRef = await db.collection('payment_images').add(paymentImage);
        paymentImage.id = docRef.id;
      }

      // Also update slipped_image collection for backward compatibility
      const slippedId = UUID ? UUID() : undefined;
      const slipped = {
        id: slippedId,
        order_id,
        imageUrl: publicUrl,
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      if (slippedId) {
        await db.collection('slipped_image').doc(slippedId).set(slipped);
      } else {
        await db.collection('slipped_image').add(slipped);
      }

      const created = Object.assign({}, paymentImage);
      if (created.created_at && typeof created.created_at.toDate === 'function') {
        created.created_at = created.created_at.toDate().toISOString();
      } else if (created.created_at instanceof Date) {
        created.created_at = created.created_at.toISOString();
      }

      // Notify admin subscribers about the uploaded payment image
      (async () => {
        try {
          const orderData = orderDoc.exists ? orderDoc.data() || {} : {};
          const customerName = orderData.customer_name || 'Customer';
          const notificationTitle = `${customerName} has submitted a payment`;
          const notificationBody = 'Please review the payment receipt.';
          const payload = JSON.stringify({ title: notificationTitle, body: notificationBody, openUrl: '/#/' });

          // Find admin user documents (username === 'admin')
          const adminUsersSnap = await db.collection('users').where('username', '==', 'admin').get();
          const endpoints = new Map();

          for (const adminDoc of adminUsersSnap.docs) {
            const adminData = adminDoc.data() || {};
            if (Array.isArray(adminData.notification_subscriptions)) {
              for (const s of adminData.notification_subscriptions) {
                if (s && s.endpoint && !endpoints.has(s.endpoint)) endpoints.set(s.endpoint, s.keys || {});
              }
            }

            // fallback: collect from global subscriptions collection
            try {
              const subsSnap = await db.collection('subscriptions').where('user_id', '==', adminDoc.id).get();
              subsSnap.forEach(sd => {
                const sdData = sd.data() || {};
                if (sdData.endpoint && !endpoints.has(sdData.endpoint)) endpoints.set(sdData.endpoint, sdData.keys || { p256dh: sdData['keys[p256dh]'], auth: sdData['keys[auth]'] });
              });
            } catch (e) {
              console.error('Error fetching admin fallback subscriptions:', e);
            }
          }

          const uniqueSubs = Array.from(endpoints.entries()).map(([endpoint, keys]) => ({ endpoint, keys }));
          if (uniqueSubs.length > 0) {
            await Promise.all(uniqueSubs.map(async s => {
              const pushSubscription = { endpoint: s.endpoint, keys: { auth: (s.keys && s.keys.auth) || s['keys[auth]'], p256dh: (s.keys && s.keys.p256dh) || s['keys[p256dh]'] } };
              try {
                await webpush.sendNotification(pushSubscription, payload);
              } catch (err) {
                console.error('Failed to send admin notification to', s.endpoint, err && err.message ? err.message : err);
              }
            }));

            // record notification in notifications collection
            try {
              await db.collection('notifications').add({ title: notificationTitle, description: notificationBody, date: Timestamp ? Timestamp.now() : new Date(), meta: { payment_image_id: paymentImage.id, order_id: order_id, notified_admin_count: uniqueSubs.length } });
            } catch (e) {
              console.error('Failed to record admin notification for uploaded payment image:', e);
            }
          }
        } catch (err) {
          console.error('Error notifying admins of uploaded payment image:', err);
        }
      })();

      res.status(201).json({ 
        message: 'Payment image uploaded successfully', 
        payment_image: created 
      });
    } catch (err) {
      console.error('Error uploading payment image:', err);
      res.status(500).json({ error: 'Failed to upload payment image' });
    }
  });

  // POST /uploadProductImage - upload product image to local storage
  app.post('/uploadProductImage', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });
      if (!bucket) return res.status(500).json({ error: 'Storage not initialized' });

      const { imageBase64, fileName, product_id } = req.body;
      if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

      // Extract base64 data (remove data:image/xxx;base64, prefix if present)
      let base64Data = imageBase64;
      let mimeType = 'image/png';
      if (imageBase64.includes(';base64,')) {
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = mimeType.split('/')[1] || 'png';
      const uniqueFileName = `${UUID()}_${fileName || `product_${product_id || 'anon'}_${Date.now()}.${fileExtension}`}`;
      const filePath = `product_images/${product_id || 'unspecified'}/${uniqueFileName}`;

      const file = bucket.file(filePath);
      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            product_id: product_id || '',
            uploadedAt: new Date().toISOString()
          }
        }
      });


      const publicUrl = file.publicUrl();

      // Save tracking info to SQLite
      const imageId = UUID ? UUID() : undefined;
      const imageRecord = {
        id: imageId,
        product_id: product_id || '',
        fileName: uniqueFileName,
        filePath,
        imageUrl: publicUrl,
        mimeType,
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      if (imageId) {
        await db.collection('product_images').doc(imageId).set(imageRecord);
      } else {
        const docRef = await db.collection('product_images').add(imageRecord);
        imageRecord.id = docRef.id;
      }

      const created = Object.assign({}, imageRecord);
      if (created.created_at && typeof created.created_at.toDate === 'function') {
        created.created_at = created.created_at.toDate().toISOString();
      } else if (created.created_at instanceof Date) {
        created.created_at = created.created_at.toISOString();
      }

      res.status(201).json({ message: 'Product image uploaded', product_image: created });
    } catch (err) {
      console.error('Error uploading product image:', err);
      res.status(500).json({ error: 'Failed to upload product image' });
    }
  });

  // GET /getPaymentImages/:order_id - get all payment images for an order
  app.get('/getPaymentImages/:order_id', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { order_id } = req.params;
      if (!order_id) {
        return res.status(400).json({ error: 'order_id is required' });
      }

      const snapshot = await db.collection('payment_images')
        .where('order_id', '==', order_id)
        .orderBy('created_at', 'desc')
        .get();

      const paymentImages = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        data.id = doc.id;
        if (data.created_at && typeof data.created_at.toDate === 'function') {
          data.created_at = data.created_at.toDate().toISOString();
        } else if (data.created_at instanceof Date) {
          data.created_at = data.created_at.toISOString();
        }
        return data;
      });

      res.json({ payment_images: paymentImages });
    } catch (err) {
      console.error('Error fetching payment images:', err);
      res.status(500).json({ error: 'Failed to fetch payment images' });
    }
  });

  // GET /getAllPaymentImages - get all payment images
  app.get('/getAllPaymentImages', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const snapshot = await db.collection('payment_images')
        .orderBy('created_at', 'desc')
        .get();

      const paymentImages = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        data.id = doc.id;
        if (data.created_at && typeof data.created_at.toDate === 'function') {
          data.created_at = data.created_at.toDate().toISOString();
        } else if (data.created_at instanceof Date) {
          data.created_at = data.created_at.toISOString();
        }
        return data;
      });

      res.json({ payment_images: paymentImages });
    } catch (err) {
      console.error('Error fetching all payment images:', err);
      res.status(500).json({ error: 'Failed to fetch payment images' });
    }
  });

  // PUT /updatePaymentImageStatus - update payment image verification status
  app.put('/updatePaymentImageStatus', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id, status } = req.body;
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }

      const validStatuses = ['pending_verification', 'verified', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }

      const docRef = db.collection('payment_images').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({ error: 'Payment image not found' });
      }

      await docRef.update({
        status,
        updated_at: Timestamp ? Timestamp.now() : new Date()
      });

      // If verified, also update the order status
      if (status === 'verified') {
        const paymentData = snapshot.data();
        if (paymentData.order_id) {
          await db.collection('orders').doc(paymentData.order_id).update({
            status: 'paid',
            updated_at: Timestamp ? Timestamp.now() : new Date()
          });
        }
      }

      const updatedSnap = await docRef.get();
      const updated = updatedSnap.data();
      updated.id = updatedSnap.id;

      if (updated.created_at && typeof updated.created_at.toDate === 'function') {
        updated.created_at = updated.created_at.toDate().toISOString();
      }
      if (updated.updated_at && typeof updated.updated_at.toDate === 'function') {
        updated.updated_at = updated.updated_at.toDate().toISOString();
      }

      res.json({ message: 'Payment image status updated', payment_image: updated });
    } catch (err) {
      console.error('Error updating payment image status:', err);
      res.status(500).json({ error: 'Failed to update payment image status' });
    }
  });

  // DELETE /rejectPayment/:order_id - reject payment by deleting all payment images and slipped images for an order
  app.delete('/rejectPayment/:order_id', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });
      if (!bucket) return res.status(500).json({ error: 'Storage not initialized' });

      const { order_id } = req.params;
      if (!order_id) {
        return res.status(400).json({ error: 'order_id is required' });
      }

      // Verify order exists
      const orderDoc = await db.collection('orders').doc(order_id).get();
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      // Delete payment images from storage and SQLite
      const paymentImagesSnap = await db.collection('payment_images')
        .where('order_id', '==', order_id)
        .get();

      const deletePromises = [];

      for (const doc of paymentImagesSnap.docs) {
        const data = doc.data();
        // Delete from local storage if filePath exists
        if (data.filePath) {
          try {
            await bucket.file(data.filePath).delete();
          } catch (storageErr) {
            console.error('Error deleting file from storage:', storageErr.message);
          }
        }
        // Delete from SQLite
        deletePromises.push(db.collection('payment_images').doc(doc.id).delete());
      }

      // Delete slipped images from SQLite
      const slippedImagesSnap = await db.collection('slipped_image')
        .where('order_id', '==', order_id)
        .get();

      for (const doc of slippedImagesSnap.docs) {
        deletePromises.push(db.collection('slipped_image').doc(doc.id).delete());
      }

      await Promise.all(deletePromises);

      // Update order status back to pending
      await db.collection('orders').doc(order_id).update({
        status: 'pending',
        updated_at: Timestamp ? Timestamp.now() : new Date()
      });

      res.json({ 
        message: 'Payment rejected successfully', 
        deleted: {
          payment_images: paymentImagesSnap.size,
          slipped_images: slippedImagesSnap.size
        }
      });
    } catch (err) {
      console.error('Error rejecting payment:', err);
      res.status(500).json({ error: 'Failed to reject payment' });
    }
  });

  // POST /uploadPaymentGateway - upload payment gateway image (QR code/bank info) for customers
  app.post('/uploadPaymentGateway', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });
      if (!bucket) return res.status(500).json({ error: 'Storage not initialized' });

      const { name, imageBase64, bankName, accountNumber, accountName, isActive } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }

      // Extract base64 data
      let base64Data = imageBase64;
      let mimeType = 'image/png';
      
      if (imageBase64.includes(';base64,')) {
        const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        }
      }

      const buffer = Buffer.from(base64Data, 'base64');
      
      const fileExtension = mimeType.split('/')[1] || 'png';
      const uniqueFileName = `payment_gateway_${UUID()}.${fileExtension}`;
      const filePath = `payment_gateway/${uniqueFileName}`;

      const file = bucket.file(filePath);
      await file.save(buffer, {
        metadata: {
          contentType: mimeType
        }
      });


      const publicUrl = file.publicUrl();

      const gatewayId = UUID ? UUID() : undefined;
      const paymentGateway = {
        id: gatewayId,
        name: name || 'Payment Gateway',
        imageUrl: publicUrl,
        filePath,
        bankName: bankName || '',
        accountNumber: accountNumber || '',
        accountName: accountName || '',
        isActive: typeof isActive === 'boolean' ? isActive : true,
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      if (gatewayId) {
        await db.collection('payment_gateway').doc(gatewayId).set(paymentGateway);
      } else {
        const docRef = await db.collection('payment_gateway').add(paymentGateway);
        paymentGateway.id = docRef.id;
      }

      const created = Object.assign({}, paymentGateway);
      if (created.created_at && typeof created.created_at.toDate === 'function') {
        created.created_at = created.created_at.toDate().toISOString();
      }

      res.status(201).json({ message: 'Payment gateway uploaded', payment_gateway: created });
    } catch (err) {
      console.error('Error uploading payment gateway:', err);
      res.status(500).json({ error: 'Failed to upload payment gateway' });
    }
  });

  // GET /getPaymentGateway - get active payment gateway for customers
  app.get('/getPaymentGateway', authenticate, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const snapshot = await db.collection('payment_gateway')
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return res.json({ payment_gateway: null });
      }

      const doc = snapshot.docs[0];
      const data = doc.data() || {};
      data.id = doc.id;
      if (data.created_at && typeof data.created_at.toDate === 'function') {
        data.created_at = data.created_at.toDate().toISOString();
      }

      res.json({ payment_gateway: data });
    } catch (err) {
      console.error('Error fetching payment gateway:', err);
      res.status(500).json({ error: 'Failed to fetch payment gateway' });
    }
  });

  // GET /getAllPaymentGateways - get all payment gateways (admin)
  app.get('/getAllPaymentGateways', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const snapshot = await db.collection('payment_gateway').get();

      const gateways = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        data.id = doc.id;
        if (data.created_at && typeof data.created_at.toDate === 'function') {
          data.created_at = data.created_at.toDate().toISOString();
        }
        return data;
      });

      res.json({ payment_gateways: gateways });
    } catch (err) {
      console.error('Error fetching payment gateways:', err);
      res.status(500).json({ error: 'Failed to fetch payment gateways' });
    }
  });

  // PUT /updatePaymentGateway - update payment gateway
  app.put('/updatePaymentGateway', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id, name, bankName, accountNumber, accountName, isActive } = req.body;
      if (!id) return res.status(400).json({ error: 'id is required' });

      const docRef = db.collection('payment_gateway').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) return res.status(404).json({ error: 'Payment gateway not found' });

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (bankName !== undefined) updates.bankName = bankName;
      if (accountNumber !== undefined) updates.accountNumber = accountNumber;
      if (accountName !== undefined) updates.accountName = accountName;
      if (isActive !== undefined) updates.isActive = Boolean(isActive);
      updates.updated_at = Timestamp ? Timestamp.now() : new Date();

      await docRef.update(updates);

      const updatedSnap = await docRef.get();
      const updated = updatedSnap.data();
      updated.id = updatedSnap.id;

      res.json({ message: 'Payment gateway updated', payment_gateway: updated });
    } catch (err) {
      console.error('Error updating payment gateway:', err);
      res.status(500).json({ error: 'Failed to update payment gateway' });
    }
  });

  // PUT /updateorderstatus - update order status (pending, paid, cancel)
  app.put('/updateorderstatus', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id, status } = req.body;
      if (!id || !status) {
        return res.status(400).json({ error: 'id and status are required' });
      }

      const validStatuses = ['pending', 'paid', 'shipped', 'cancel'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }

      const docRef = db.collection('orders').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }

      await docRef.update({
        status,
        updated_at: Timestamp ? Timestamp.now() : new Date()
      });

      const updatedSnap = await docRef.get();
      const updated = updatedSnap.data();
      updated.id = updatedSnap.id;

      if (updated.created_at && typeof updated.created_at.toDate === 'function') {
        updated.created_at = updated.created_at.toDate().toISOString();
      } else if (updated.created_at instanceof Date) {
        updated.created_at = updated.created_at.toISOString();
      }
      if (updated.updated_at && typeof updated.updated_at.toDate === 'function') {
        updated.updated_at = updated.updated_at.toDate().toISOString();
      } else if (updated.updated_at instanceof Date) {
        updated.updated_at = updated.updated_at.toISOString();
      }

      // Notify the order owner about the status change
      (async () => {
        try {
          const userId = updated.user_id;
          if (!userId) return;

          const notificationTitle = 'Your order status has been updated';
          const notificationBody = 'Please check your order status.';
          const payload = JSON.stringify({ title: notificationTitle, body: notificationBody, openUrl: '/#/orders' });

          const endpoints = new Map();

          // collect from user's notification_subscriptions array
          try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
              const userData = userDoc.data() || {};
              if (Array.isArray(userData.notification_subscriptions)) {
                for (const s of userData.notification_subscriptions) {
                  if (s && s.endpoint && !endpoints.has(s.endpoint)) endpoints.set(s.endpoint, s.keys || {});
                }
              }
            }
          } catch (e) {
            console.error('Error reading user notification_subscriptions:', e);
          }

          // fallback: collect from global subscriptions collection
          try {
            const subsSnap = await db.collection('subscriptions').where('user_id', '==', userId).get();
            subsSnap.forEach(sd => {
              const sdData = sd.data() || {};
              if (sdData.endpoint && !endpoints.has(sdData.endpoint)) endpoints.set(sdData.endpoint, sdData.keys || { p256dh: sdData['keys[p256dh]'], auth: sdData['keys[auth]'] });
            });
          } catch (e) {
            console.error('Error fetching fallback subscriptions for user:', e);
          }

          const uniqueSubs = Array.from(endpoints.entries()).map(([endpoint, keys]) => ({ endpoint, keys }));
          if (uniqueSubs.length > 0) {
            await Promise.all(uniqueSubs.map(async s => {
              const pushSubscription = { endpoint: s.endpoint, keys: { auth: (s.keys && s.keys.auth) || s['keys[auth]'], p256dh: (s.keys && s.keys.p256dh) || s['keys[p256dh]'] } };
              try {
                await webpush.sendNotification(pushSubscription, payload);
              } catch (err) {
                console.error('Failed to send order-status notification to', s.endpoint, err && err.message ? err.message : err);
              }
            }));

            try {
              await db.collection('notifications').add({ title: notificationTitle, description: notificationBody, date: Timestamp ? Timestamp.now() : new Date(), meta: { order_id: updated.id, user_id: userId, status } });
            } catch (e) {
              console.error('Failed to record order-status notification:', e);
            }
          }
        } catch (err) {
          console.error('Error notifying user of order status update:', err);
        }
      })();

      res.json({ message: 'Order status updated', order: updated });
    } catch (err) {
      console.error('Error updating order status:', err);
      res.status(500).json({ error: 'Failed to update order status' });
    }
  });

  // POST /calculateShipping - calculate shipping price
    app.post('/calculateShipping', async (req, res) => {
      try {
        if (!db) return res.status(500).json({ error: 'Database not initialized' });
        const { weight, type } = req.body; // type: 'standard' or 'premium'
        if (!weight || !type) return res.status(400).json({ error: 'weight and type are required' });

        // Get config from DB or use default
        let configDoc = await db.collection('config').doc('shipping').get();
        let config = configDoc.exists ? configDoc.data() : defaultShippingConfig;
        if (!config[type]) return res.status(400).json({ error: 'Invalid shipping type' });
        const { pricePerKg, minDays, maxDays } = config[type];

        // Calculate chargeable weight (1kg min, round up to next kg)
        let chargeableWeight = Math.ceil(Number(weight));
        if (chargeableWeight < 1) chargeableWeight = 1;

        const price = pricePerKg * chargeableWeight;
        res.json({
          type,
          price,
          chargeableWeight,
          minDays,
          maxDays
        });
      } catch (err) {
        res.status(500).json({ error: 'Failed to calculate shipping' });
      }
    });
  // Default shipping config (used if not set in DB)
  const defaultShippingConfig = {
    standard: {
      pricePerKg: 1,
      maxDays: 4,
      minDays: 3
    },
    premium: {
      pricePerKg: 2,
      maxDays: 2,
      minDays: 1
    }
  };

  // GET /shippingConfig - get current shipping config
  app.get('/shippingConfig', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });
      const doc = await db.collection('config').doc('shipping').get();
      if (!doc.exists) return res.json({ config: defaultShippingConfig });
      res.json({ config: doc.data() });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get shipping config' });
    }
  });

  // PUT /shippingConfig - update shipping config
  app.put('/shippingConfig', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });
      const { standard, premium } = req.body;
      if (!standard || !premium) return res.status(400).json({ error: 'standard and premium config required' });
      await db.collection('config').doc('shipping').set({ standard, premium });
      res.json({ message: 'Shipping config updated', config: { standard, premium } });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update shipping config' });
    }
  });

  // POST /addcategories - create a new category
  app.post('/addcategories', authenticate, ensureAdmin,  async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id, name, description, is_active, imageBase64, fileName } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const categoryId = id || (UUID ? UUID() : undefined);


      const category = {
        id: categoryId,
        name,
        description: description || '',
        is_active: typeof is_active === 'boolean' ? is_active : true,
        imageUrl: '',
        filePath: '',
        mimeType: '',
        created_at: Timestamp ? Timestamp.now() : new Date()
      };

      // If an image was provided as base64, upload to storage
      if (imageBase64 && bucket) {
        try {
          // Extract base64 payload and mime type
          let base64Data = imageBase64;
          let mimeType = 'image/png';
          if (imageBase64.includes(';base64,')) {
            const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              mimeType = matches[1];
              base64Data = matches[2];
            }
          }

          const buffer = Buffer.from(base64Data, 'base64');
          const fileExtension = mimeType.split('/')[1] || 'png';
          const uniqueFileName = `${UUID()}_${fileName || `category_${categoryId || 'anon'}_${Date.now()}.${fileExtension}`}`;
          const filePath = `category_images/${categoryId || 'unspecified'}/${uniqueFileName}`;

          const file = bucket.file(filePath);
          await file.save(buffer, {
            metadata: {
              contentType: mimeType,
              metadata: {
                category_id: categoryId || '',
                uploadedAt: new Date().toISOString()
              }
            }
          });

          const publicUrl = file.publicUrl();

          category.imageUrl = publicUrl;
          category.filePath = filePath;
          category.mimeType = mimeType;
        } catch (err) {
          console.error('Error uploading category image:', err);
          // proceed without failing creation
        }
      }

      if (categoryId) {
        await db.collection('categories').doc(categoryId).set(category);
      } else {
        const docRef = await db.collection('categories').add(category);
        category.id = docRef.id;
      }

      const created = Object.assign({}, category);
      if (created.created_at && typeof created.created_at.toDate === 'function') {
        created.created_at = created.created_at.toDate().toISOString();
      } else if (created.created_at instanceof Date) {
        created.created_at = created.created_at.toISOString();
      }

      res.status(201).json({ message: 'Category created', category: created });
    } catch (err) {
      console.error('Error creating category:', err);
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

      // PUT /editcategories - update an existing category (supports image upload)
      app.put('/editcategories', authenticate, ensureAdmin, async (req, res) => {
        try {
          if (!db) return res.status(500).json({ error: 'Database not initialized' });

          const { id, name, description, is_active, imageBase64, fileName } = req.body;
          if (!id) return res.status(400).json({ error: 'Category id is required' });

          const docRef = db.collection('categories').doc(id);
          const snapshot = await docRef.get();
          if (!snapshot.exists) return res.status(404).json({ error: 'Category not found' });

          const updates = {};
          if (name !== undefined) updates.name = name;
          if (description !== undefined) updates.description = description;
          if (is_active !== undefined) updates.is_active = typeof is_active === 'boolean' ? is_active : Boolean(is_active);

          // If an image was provided, upload and update imageUrl/filePath
          if (imageBase64 && bucket) {
            try {
              let base64Data = imageBase64;
              let mimeType = 'image/png';
              if (imageBase64.includes(';base64,')) {
                const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                  mimeType = matches[1];
                  base64Data = matches[2];
                }
              }

              const buffer = Buffer.from(base64Data, 'base64');
              const fileExtension = mimeType.split('/')[1] || 'png';
              const uniqueFileName = `${UUID()}_${fileName || `category_${id}_${Date.now()}.${fileExtension}`}`;
              const filePath = `category_images/${id}/${uniqueFileName}`;

              const file = bucket.file(filePath);
              await file.save(buffer, {
                metadata: {
                  contentType: mimeType,
                  metadata: {
                    category_id: id,
                    uploadedAt: new Date().toISOString()
                  }
                }
              });

              const publicUrl = file.publicUrl();

              updates.imageUrl = publicUrl;
              updates.filePath = filePath;
              updates.mimeType = mimeType;
            } catch (err) {
              console.error('Error uploading category image:', err);
            }
          }

          updates.updated_at = Timestamp ? Timestamp.now() : new Date();

          await docRef.update(updates);

          const updatedSnap = await docRef.get();
          const updated = updatedSnap.data();
          updated.id = updatedSnap.id;

          if (updated.created_at && typeof updated.created_at.toDate === 'function') {
            updated.created_at = updated.created_at.toDate().toISOString();
          } else if (updated.created_at instanceof Date) {
            updated.created_at = updated.created_at.toISOString();
          }
          if (updated.updated_at && typeof updated.updated_at.toDate === 'function') {
            updated.updated_at = updated.updated_at.toDate().toISOString();
          } else if (updated.updated_at instanceof Date) {
            updated.updated_at = updated.updated_at.toISOString();
          }

          res.json({ message: 'Category updated', category: updated });
        } catch (err) {
          console.error('Error updating category:', err);
          res.status(500).json({ error: 'Failed to update category' });
        }
      });

  // GET /viewcategories - fetch all categories
  app.get('/viewcategories', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const snapshot = await db.collection('categories').get();
      const categories = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        data.id = doc.id;
        if (data.created_at && typeof data.created_at.toDate === 'function') {
          data.created_at = data.created_at.toDate().toISOString();
        } else if (data.created_at instanceof Date) {
          data.created_at = data.created_at.toISOString();
        }
        return data;
      });

      res.json({ categories });
    } catch (err) {
      console.error('Error fetching categories:', err);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // DELETE /deletecategories/:id - delete a category by id
  app.delete('/deletecategories/:id', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Category id is required' });

      const docRef = db.collection('categories').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) return res.status(404).json({ error: 'Category not found' });

      await docRef.delete();

      res.json({ message: 'Category deleted', id });
    } catch (err) {
      console.error('Error deleting category:', err);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  // POST /addvariant - create a new product variant with options
  app.post('/addvariant', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const {
        id,
        product_id,
        variant,
        options
      } = req.body;

      // Validate required fields
      if (!product_id) {
        return res.status(400).json({ error: 'product_id is required' });
      }
      if (!variant || typeof variant !== 'string') {
        return res.status(400).json({ error: 'variant name is required' });
      }
      if (!options || !Array.isArray(options) || options.length === 0) {
        return res.status(400).json({ error: 'options array is required and must not be empty' });
      }

      // Ensure product exists
      const prodRef = db.collection('products').doc(product_id);
      const prodSnap = await prodRef.get();
      if (!prodSnap.exists) return res.status(404).json({ error: 'Product not found' });

      // Validate all options have required fields and collect SKUs
      const skusInRequest = [];
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (!opt.name) {
          return res.status(400).json({ error: `Option at index ${i} is missing 'name'` });
        }
        if (!opt.sku) {
          return res.status(400).json({ error: `Option at index ${i} is missing 'sku'` });
        }
        if (skusInRequest.includes(opt.sku)) {
          return res.status(400).json({ error: `Duplicate SKU '${opt.sku}' found in options` });
        }
        skusInRequest.push(opt.sku);
      }

      // Check SKU uniqueness against existing variants in the database
      const existingVariantsSnap = await db.collection('product_variants').get();
      const existingSkus = new Set();
      existingVariantsSnap.forEach(doc => {
        const data = doc.data();
        if (data.options && Array.isArray(data.options)) {
          data.options.forEach(opt => {
            if (opt.sku) existingSkus.add(opt.sku);
          });
        }
        // Also check legacy sku field
        if (data.sku) existingSkus.add(data.sku);
      });

      for (const sku of skusInRequest) {
        if (existingSkus.has(sku)) {
          return res.status(400).json({ error: `SKU '${sku}' already exists in the database` });
        }
      }

      // Generate variant ID
      const variantId = id || (UUID ? UUID() : undefined);
      const createdTime = Timestamp ? Timestamp.now() : new Date();

      // Build options array with created_time for each option
      const processedOptions = options.map(opt => ({
        name: opt.name,
        description: opt.description || '',
        sku: opt.sku,
        stock: typeof opt.stock === 'number' ? opt.stock : (opt.stock ? Number(opt.stock) : 0),
        price: typeof opt.price === 'number' ? opt.price : (opt.price ? Number(opt.price) : 0),
        weight: typeof opt.weight === 'number' ? opt.weight : (opt.weight ? Number(opt.weight) : 0),
        created_time: createdTime,
        imageUrl: opt.imageUrl || '',
        isActive: typeof opt.isActive === 'boolean' ? opt.isActive : true
      }));

      // Build the variant document
      const variantDoc = {
        id: variantId,
        product_id,
        variant,
        options: processedOptions
      };

      // Save to SQLite
      if (variantId) {
        await db.collection('product_variants').doc(variantId).set(variantDoc);
      } else {
        const docRef = await db.collection('product_variants').add(variantDoc);
        variantDoc.id = docRef.id;
      }

      // Convert timestamps for response
      const responseVariant = {
        ...variantDoc,
        options: variantDoc.options.map(opt => {
          const optCopy = { ...opt };
          if (optCopy.created_time && typeof optCopy.created_time.toDate === 'function') {
            optCopy.created_time = optCopy.created_time.toDate().toISOString();
          } else if (optCopy.created_time instanceof Date) {
            optCopy.created_time = optCopy.created_time.toISOString();
          }
          return optCopy;
        })
      };

      res.status(201).json({ message: 'Variant created', variant: responseVariant });
    } catch (err) {
      console.error('Error creating variant:', err);
      res.status(500).json({ error: 'Failed to create variant' });
    }
  });

  // PUT /editvariant - update an existing product variant
  app.put('/editvariant', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id, variant, options } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Variant id is required' });
      }

      const docRef = db.collection('product_variants').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({ error: 'Variant not found' });
      }

      const existingData = snapshot.data();

      // Validate options if provided
      if (options && Array.isArray(options)) {
        const skusInRequest = [];
        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          if (!opt.name) {
            return res.status(400).json({ error: `Option at index ${i} is missing 'name'` });
          }
          if (!opt.sku) {
            return res.status(400).json({ error: `Option at index ${i} is missing 'sku'` });
          }
          if (skusInRequest.includes(opt.sku)) {
            return res.status(400).json({ error: `Duplicate SKU '${opt.sku}' found in options` });
          }
          skusInRequest.push(opt.sku);
        }

        // Get existing SKUs from this variant to exclude from uniqueness check
        const existingVariantSkus = new Set();
        if (existingData.options && Array.isArray(existingData.options)) {
          existingData.options.forEach(opt => {
            if (opt.sku) existingVariantSkus.add(opt.sku);
          });
        }

        // Check SKU uniqueness against other variants
        const allVariantsSnap = await db.collection('product_variants').get();
        const otherSkus = new Set();
        allVariantsSnap.forEach(doc => {
          if (doc.id === id) return; // Skip current variant
          const data = doc.data();
          if (data.options && Array.isArray(data.options)) {
            data.options.forEach(opt => {
              if (opt.sku) otherSkus.add(opt.sku);
            });
          }
        });

        for (const sku of skusInRequest) {
          if (otherSkus.has(sku)) {
            return res.status(400).json({ error: `SKU '${sku}' already exists in another variant` });
          }
        }
      }

      const updates = {};
      if (variant !== undefined) updates.variant = variant;
      if (options !== undefined) {
        const updatedTime = Timestamp ? Timestamp.now() : new Date();
        updates.options = options.map(opt => ({
          name: opt.name,
          description: opt.description || '',
          sku: opt.sku,
          stock: typeof opt.stock === 'number' ? opt.stock : (opt.stock ? Number(opt.stock) : 0),
          price: typeof opt.price === 'number' ? opt.price : (opt.price ? Number(opt.price) : 0),
          weight: typeof opt.weight === 'number' ? opt.weight : (opt.weight ? Number(opt.weight) : 0),
          imageUrl: opt.imageUrl || '',
          isActive: typeof opt.isActive === 'boolean' ? opt.isActive : true,
          created_time: opt.created_time || updatedTime
        }));
      }
      updates.updated_at = Timestamp ? Timestamp.now() : new Date();

      await docRef.update(updates);

      const updatedSnap = await docRef.get();
      const updated = updatedSnap.data();
      updated.id = updatedSnap.id;

      // Convert timestamps for response
      if (updated.options && Array.isArray(updated.options)) {
        updated.options = updated.options.map(opt => {
          const optCopy = { ...opt };
          if (optCopy.created_time && typeof optCopy.created_time.toDate === 'function') {
            optCopy.created_time = optCopy.created_time.toDate().toISOString();
          } else if (optCopy.created_time instanceof Date) {
            optCopy.created_time = optCopy.created_time.toISOString();
          }
          return optCopy;
        });
      }
      if (updated.updated_at && typeof updated.updated_at.toDate === 'function') {
        updated.updated_at = updated.updated_at.toDate().toISOString();
      }

      res.json({ message: 'Variant updated', variant: updated });
    } catch (err) {
      console.error('Error updating variant:', err);
      res.status(500).json({ error: 'Failed to update variant' });
    }
  });

  // DELETE /deletevariant/:id - delete a product variant
  app.delete('/deletevariant/:id', authenticate, ensureAdmin, async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { id } = req.params;
      if (!id) return res.status(400).json({ error: 'Variant id is required' });

      const docRef = db.collection('product_variants').doc(id);
      const snapshot = await docRef.get();
      if (!snapshot.exists) return res.status(404).json({ error: 'Variant not found' });

      await docRef.delete();

      res.json({ message: 'Variant deleted', id });
    } catch (err) {
      console.error('Error deleting variant:', err);
      res.status(500).json({ error: 'Failed to delete variant' });
    }
  });

  // GET /getvariants/:product_id - list variants for a product
  app.get('/getvariants/:product_id', async (req, res) => {
    try {
      if (!db) return res.status(500).json({ error: 'Database not initialized' });

      const { product_id } = req.params;
      if (!product_id) return res.status(400).json({ error: 'product_id is required' });

      // Query without orderBy to avoid needing a composite index
      const snapshot = await db.collection('product_variants')
        .where('product_id', '==', product_id)
        .get();

      const variants = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        data.id = doc.id;
        if (data.created_at && typeof data.created_at.toDate === 'function') {
          data.created_at = data.created_at.toDate().toISOString();
        } else if (data.created_at instanceof Date) {
          data.created_at = data.created_at.toISOString();
        }
        return data;
      });

      // Sort by created_at descending in JS (avoids composite index requirement)
      variants.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA;
      });

      res.json({ variants });
    } catch (err) {
      console.error('Error fetching variants:', err);
      res.status(500).json({ error: 'Failed to fetch variants' });
    }
  });

  // ==================== User Address Routes ====================

  // Get all addresses for the current user
  app.get('/user/addresses', authenticate, async (req, res) => {
    try {
      const userId = req.user.id;
      const snapshot = await db.collection('user_addresses')
        .where('user_id', '==', userId)
        .orderBy('is_default', 'desc')
        .orderBy('created_at', 'desc')
        .get();
      
      const addresses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || null
      }));
      
      res.json({ addresses });
    } catch (err) {
      console.error('Error fetching addresses:', err);
      res.status(500).json({ error: 'Failed to fetch addresses' });
    }
  });

  // Add a new address
  app.post('/user/addresses', authenticate, async (req, res) => {
    try {
      const userId = req.user.id;
      const { name, phone, address, is_default } = req.body;
      
      if (!name || !phone || !address) {
        return res.status(400).json({ error: 'name, phone, and address are required' });
      }
      
      // If this is set as default, unset other defaults
      if (is_default) {
        const existingDefaults = await db.collection('user_addresses')
          .where('user_id', '==', userId)
          .where('is_default', '==', true)
          .get();
        
        const batch = db.batch();
        existingDefaults.docs.forEach(doc => {
          batch.update(doc.ref, { is_default: false });
        });
        await batch.commit();
      }
      
      // Check if user has any addresses - if not, make this default
      const existingAddresses = await db.collection('user_addresses')
        .where('user_id', '==', userId)
        .limit(1)
        .get();
      
      const shouldBeDefault = is_default || existingAddresses.empty;
      
      const FieldValue = deps.FieldValue;
      const docRef = await db.collection('user_addresses').add({
        user_id: userId,
        name,
        phone,
        address,
        is_default: shouldBeDefault,
        created_at: FieldValue ? FieldValue.serverTimestamp() : new Date()
      });
      
      res.status(201).json({
        id: docRef.id,
        user_id: userId,
        name,
        phone,
        address,
        is_default: shouldBeDefault
      });
    } catch (err) {
      console.error('Error adding address:', err);
      res.status(500).json({ error: 'Failed to add address' });
    }
  });

  // Update an address
  app.put('/user/addresses/:id', authenticate, async (req, res) => {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      const { name, phone, address, is_default } = req.body;
      
      const docRef = db.collection('user_addresses').doc(addressId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: 'Address not found' });
      }
      
      if (doc.data().user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // If setting as default, unset other defaults
      if (is_default) {
        const existingDefaults = await db.collection('user_addresses')
          .where('user_id', '==', userId)
          .where('is_default', '==', true)
          .get();
        
        const batch = db.batch();
        existingDefaults.docs.forEach(d => {
          if (d.id !== addressId) {
            batch.update(d.ref, { is_default: false });
          }
        });
        await batch.commit();
      }
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (is_default !== undefined) updateData.is_default = is_default;
      
      await docRef.update(updateData);
      
      res.json({ id: addressId, ...updateData });
    } catch (err) {
      console.error('Error updating address:', err);
      res.status(500).json({ error: 'Failed to update address' });
    }
  });

  // Delete an address
  app.delete('/user/addresses/:id', authenticate, async (req, res) => {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      
      const docRef = db.collection('user_addresses').doc(addressId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: 'Address not found' });
      }
      
      if (doc.data().user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const wasDefault = doc.data().is_default;
      await docRef.delete();
      
      // If deleted address was default, set another one as default
      if (wasDefault) {
        const remaining = await db.collection('user_addresses')
          .where('user_id', '==', userId)
          .orderBy('created_at', 'desc')
          .limit(1)
          .get();
        
        if (!remaining.empty) {
          await remaining.docs[0].ref.update({ is_default: true });
        }
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting address:', err);
      res.status(500).json({ error: 'Failed to delete address' });
    }
  });

  // Set an address as default
  app.put('/user/addresses/:id/default', authenticate, async (req, res) => {
    try {
      const userId = req.user.id;
      const addressId = req.params.id;
      
      const docRef = db.collection('user_addresses').doc(addressId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: 'Address not found' });
      }
      
      if (doc.data().user_id !== userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Unset all other defaults
      const existingDefaults = await db.collection('user_addresses')
        .where('user_id', '==', userId)
        .where('is_default', '==', true)
        .get();
      
      const batch = db.batch();
      existingDefaults.docs.forEach(d => {
        batch.update(d.ref, { is_default: false });
      });
      batch.update(docRef, { is_default: true });
      await batch.commit();
      
      res.json({ success: true });
    } catch (err) {
      console.error('Error setting default address:', err);
      res.status(500).json({ error: 'Failed to set default address' });
    }
  });

  // ==================== End User Address Routes ====================

  // ==================== Banner/Slide Routes ====================

  // GET /banners - Get all banners (public)
  app.get('/banners', async (req, res) => {
    try {
      const snapshot = await db.collection('banners')
        .orderBy('slide_order', 'asc')
        .get();
      
      const banners = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || null,
          updated_at: data.updated_at?.toDate?.()?.toISOString() || null
        };
      });
      
      res.json({ banners });
    } catch (err) {
      console.error('Error fetching banners:', err);
      res.status(500).json({ error: 'Failed to fetch banners' });
    }
  });

  // GET /banners/:id - Get a single banner
  app.get('/banners/:id', async (req, res) => {
    try {
      const doc = await db.collection('banners').doc(req.params.id).get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: 'Banner not found' });
      }
      
      const data = doc.data();
      res.json({
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || null
      });
    } catch (err) {
      console.error('Error fetching banner:', err);
      res.status(500).json({ error: 'Failed to fetch banner' });
    }
  });

  // POST /banners - Create a new banner (admin only)
  app.post('/banners', authenticate, ensureAdmin, async (req, res) => {
    try {
      const { title, description, slide_order, image_url, button_name, button_url, is_active } = req.body;
      
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      const FieldValue = deps.FieldValue;
      const bannerData = {
        title,
        description: description || '',
        slide_order: typeof slide_order === 'number' ? slide_order : 0,
        image_url: image_url || '',
        button_name: button_name || '',
        button_url: button_url || '',
        is_active: typeof is_active === 'boolean' ? is_active : true,
        created_at: FieldValue ? FieldValue.serverTimestamp() : new Date(),
        updated_at: FieldValue ? FieldValue.serverTimestamp() : new Date()
      };
      
      const docRef = await db.collection('banners').add(bannerData);
      
      res.status(201).json({
        id: docRef.id,
        ...bannerData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error creating banner:', err);
      res.status(500).json({ error: 'Failed to create banner' });
    }
  });

  // PUT /banners/:id - Update a banner (admin only)
  app.put('/banners/:id', authenticate, ensureAdmin, async (req, res) => {
    try {
      const { title, description, slide_order, image_url, button_name, button_url, is_active } = req.body;
      
      const docRef = db.collection('banners').doc(req.params.id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: 'Banner not found' });
      }
      
      const FieldValue = deps.FieldValue;
      const updateData = {
        updated_at: FieldValue ? FieldValue.serverTimestamp() : new Date()
      };
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (slide_order !== undefined) updateData.slide_order = slide_order;
      if (image_url !== undefined) updateData.image_url = image_url;
      if (button_name !== undefined) updateData.button_name = button_name;
      if (button_url !== undefined) updateData.button_url = button_url;
      if (is_active !== undefined) updateData.is_active = is_active;
      
      await docRef.update(updateData);
      
      const updatedDoc = await docRef.get();
      const data = updatedDoc.data();
      
      res.json({
        id: updatedDoc.id,
        ...data,
        created_at: data.created_at?.toDate?.()?.toISOString() || null,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || null
      });
    } catch (err) {
      console.error('Error updating banner:', err);
      res.status(500).json({ error: 'Failed to update banner' });
    }
  });

  // DELETE /banners/:id - Delete a banner (admin only)
  app.delete('/banners/:id', authenticate, ensureAdmin, async (req, res) => {
    try {
      const docRef = db.collection('banners').doc(req.params.id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ error: 'Banner not found' });
      }
      
      await docRef.delete();
      
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting banner:', err);
      res.status(500).json({ error: 'Failed to delete banner' });
    }
  });

  // POST /banners/upload-image - Upload banner image (admin only)
  app.post('/banners/upload-image', authenticate, ensureAdmin, async (req, res) => {
    try {
      const { imageBase64 } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 is required' });
      }
      
      // Extract base64 data
      const matches = imageBase64.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ error: 'Invalid image format' });
      }
      
      const imageType = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generate unique filename
      const filename = `banners/${UUID ? UUID() : Date.now()}.${imageType === 'jpeg' ? 'jpg' : imageType}`;
      
      // Upload to local storage
      const file = bucket.file(filename);
      const uuid = UUID ? UUID() : Date.now().toString();
      
      await file.save(buffer, {
        metadata: {
          contentType: `image/${imageType}`,
          metadata: {
            uploadId: uuid
          }
        }
      });
      
      // Generate public URL
      const imageUrl = file.publicUrl();
      
      res.json({ image_url: imageUrl });
    } catch (err) {
      console.error('Error uploading banner image:', err);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  });

  // ==================== End Banner/Slide Routes ====================

  return {};
};