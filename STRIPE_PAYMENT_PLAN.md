# แผนพัฒนาระบบชำระเงินด้วย Stripe

## 1. เป้าหมาย

เพิ่มการชำระเงินด้วย Stripe PromptPay ให้ลูกค้าสแกน Dynamic QR และให้ระบบยืนยันผลการชำระเงินอัตโนมัติผ่าน Stripe webhook โดยยังสามารถเก็บระบบ QR แบบรูปภาพและการอัปโหลดสลิปเดิมไว้เป็นช่องทางสำรองในช่วงเปลี่ยนผ่านได้

แนวทางสำหรับเฟสแรกคือใช้ **Stripe Checkout** ซึ่งเป็นหน้าชำระเงินที่ Stripe ดูแลให้ เนื่องจากใช้โค้ดฝั่ง frontend น้อย ลดขอบเขตการจัดการข้อมูลการชำระเงิน และรองรับ PromptPay โดยตรง

## 2. Flow ที่ต้องการ

```text
ลูกค้าสร้างออเดอร์
        ↓
Backend อ่านสินค้าและคำนวณยอดจากฐานข้อมูล
        ↓
Backend สร้าง Stripe Checkout Session
        ↓
Frontend เปิด Checkout URL ของ Stripe
        ↓
ลูกค้าสแกน PromptPay QR และชำระเงิน
        ↓
Stripe ส่ง webhook มาที่ Backend
        ↓
Backend ตรวจลายเซ็นและยอดเงิน
        ↓
Backend เปลี่ยน payment_status เป็น paid
```

ห้ามใช้หน้า success เป็นหลักฐานว่าจ่ายสำเร็จ การเปลี่ยนสถานะเป็น `paid` ต้องเกิดจาก webhook ที่ตรวจสอบลายเซ็นแล้วเท่านั้น

## 3. การตั้งค่า Stripe Dashboard

1. สมัครและยืนยันบัญชี Stripe สำหรับประเทศไทย
2. เปิด Test mode ระหว่างพัฒนา
3. ไปที่ Payment methods และเปิด PromptPay
4. ไปที่ Developers > API keys และสร้างหรือคัดลอก Test secret key
5. ไปที่ Developers > Webhooks และเพิ่ม endpoint:

   ```text
   https://<production-domain>/api/payments/stripe/webhook
   ```

6. Subscribe event อย่างน้อย:

   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `checkout.session.expired`
   - `charge.refunded`

7. คัดลอก webhook signing secret ที่ขึ้นต้นด้วย `whsec_`

เอกสารอ้างอิง:

- [Stripe PromptPay](https://docs.stripe.com/payments/promptpay)
- [Stripe API keys](https://docs.stripe.com/keys)
- [Stripe webhooks](https://docs.stripe.com/webhooks)

## 4. Environment variables

เพิ่มค่าจริงใน `backend/.env`:

```dotenv
STRIPE_SECRET_KEY=sk_test_xxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
APP_BASE_URL=http://localhost:9000
```

Production ใช้ค่าคนละชุด:

```dotenv
STRIPE_SECRET_KEY=sk_live_xxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
APP_BASE_URL=https://<production-domain>
```

เพิ่มเฉพาะชื่อตัวแปรโดยไม่มีค่าจริงใน `backend/.env.example`:

```dotenv
# Stripe server-side credentials
# STRIPE_SECRET_KEY=
# STRIPE_WEBHOOK_SECRET=
# APP_BASE_URL=http://localhost:9000
```

ข้อกำหนด:

- ห้ามใส่ `STRIPE_SECRET_KEY` และ `STRIPE_WEBHOOK_SECRET` ใน frontend
- ห้าม commit key จริงลง Git
- แยก Test key และ Live key ออกจากกัน
- Webhook secret จาก Stripe CLI และ Stripe Dashboard เป็นคนละค่า
- Stripe Checkout แบบ redirect URL ไม่จำเป็นต้องใช้ publishable key ใน frontend

## 5. Backend dependency และโครงสร้างไฟล์

ติดตั้ง Stripe Node SDK:

```bash
npm --prefix backend install stripe
```

เพิ่ม service:

```text
backend/services/stripe-payment/index.js
```

Register service ใน `backend/index.js` และส่ง dependency ที่จำเป็น เช่น `db`, `FieldValue` และ `authenticate` เข้า service

## 6. API ที่ต้องเพิ่ม

### 6.1 สร้าง Checkout Session

```http
POST /payments/stripe/checkout-session
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "orderId": "<order-id>"
}
```

Backend ต้องทำตามลำดับดังนี้:

1. ตรวจสอบ authentication
2. โหลด order จากฐานข้อมูล
3. ตรวจว่า order เป็นของผู้ใช้ปัจจุบัน
4. ตรวจว่า order ยังไม่ได้ชำระเงิน
5. โหลด order items และข้อมูลสินค้าจากฐานข้อมูล
6. คำนวณยอดรวมใหม่บน backend รวมค่าจัดส่ง
7. แปลงบาทเป็นสตางค์ด้วย `Math.round(totalPrice * 100)`
8. สร้าง Stripe Checkout Session โดยใช้ `currency: "thb"`
9. กำหนด `metadata.order_id` และ `client_reference_id`
10. ใช้ idempotency key เช่น `checkout-<orderId>` เพื่อป้องกัน session ซ้ำ
11. บันทึก Checkout Session ID ลง payment record
12. ส่ง `session.url` กลับให้ frontend

ตัวอย่าง response:

```json
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

ห้ามรับยอดเงินจาก frontend แล้วส่งให้ Stripe โดยตรง เพราะ request ฝั่ง client สามารถถูกแก้ไขได้

### 6.2 ตรวจสอบสถานะการชำระเงิน

```http
GET /payments/stripe/status/:orderId
Authorization: Bearer <user-token>
```

Endpoint นี้อ่านสถานะจากฐานข้อมูลของระบบ ไม่จำเป็นต้องเรียก Stripe ทุกครั้ง และต้องตรวจว่า order เป็นของผู้ใช้ปัจจุบัน

ตัวอย่าง response:

```json
{
  "orderId": "...",
  "paymentStatus": "paid"
}
```

### 6.3 Stripe webhook

```http
POST /payments/stripe/webhook
Stripe-Signature: ...
```

Webhook handler ต้อง:

1. รับ raw request body
2. ตรวจ `Stripe-Signature` ด้วย `STRIPE_WEBHOOK_SECRET`
3. ตรวจว่า `event.id` ยังไม่เคยประมวลผล
4. โหลด order จาก `metadata.order_id`
5. ตรวจ currency และยอดเงินให้ตรงกับ order
6. อัปเดต payment และ order ตามชนิด event
7. บันทึก `event.id` ก่อนตอบ `2xx` เพื่อรองรับ webhook ที่ถูกส่งซ้ำ

Event handling:

| Event | การทำงาน |
|---|---|
| `payment_intent.succeeded` | เปลี่ยน `payment_status` เป็น `paid` และบันทึก `paid_at` |
| `payment_intent.payment_failed` | เปลี่ยนเป็น `failed` และเก็บ failure reason ที่ปลอดภัย |
| `checkout.session.expired` | เปลี่ยน session ที่ยังไม่จ่ายเป็น `expired` |
| `charge.refunded` | เปลี่ยนเป็น `refunded` หรือ `partially_refunded` ตามยอดคืน |

## 7. การจัดการ raw body ของ webhook

ปัจจุบัน `backend/index.js` เรียก `express.json()` แบบ global ก่อน register payment routes แต่ Stripe ต้องใช้ raw body เพื่อตรวจสอบ webhook signature

ต้องวาง Stripe webhook route ก่อน JSON parser:

```js
app.post(
  '/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhookHandler
)

app.use(express.json({ limit: '3mb' }))
app.use(express.urlencoded({ limit: '3mb', extended: true }))
```

ระบบ proxy ปัจจุบันตัด `/api` ออกก่อนส่งเข้า backend ดังนั้น:

- Public webhook URL: `/api/payments/stripe/webhook`
- Internal backend route: `/payments/stripe/webhook`

ต้องทดสอบ routing จริงบน production reverse proxy อีกครั้งก่อนเปิด Live mode

## 8. Data model

ควรแยกสถานะออเดอร์ออกจากสถานะการชำระเงิน

เพิ่มข้อมูลใน `orders`:

```js
{
  status: "pending",
  payment_status: "unpaid",
  payment_provider: "stripe",
  payment_method: "promptpay",
  stripe_checkout_session_id: null,
  stripe_payment_intent_id: null,
  paid_at: null
}
```

ค่า `payment_status` ที่รองรับ:

```text
unpaid
processing
paid
failed
expired
refunded
partially_refunded
```

ค่า `status` ของกระบวนการจัดส่ง:

```text
pending
confirmed
processing
shipped
completed
cancelled
```

เพิ่ม collection `payments`:

```js
{
  order_id: "...",
  provider: "stripe",
  method: "promptpay",
  checkout_session_id: "cs_...",
  payment_intent_id: "pi_...",
  amount: 10000,
  currency: "thb",
  status: "processing",
  processed_event_ids: [],
  created_at: "...",
  updated_at: "..."
}
```

ยอดใน payment record ควรเก็บเป็นจำนวนเต็มหน่วยสตางค์

## 9. การปรับ flow สร้างออเดอร์

ปัจจุบัน frontend ส่ง `total_price` ไปที่ `/addorders` และสร้าง order items แยกหลาย request ซึ่งมีความเสี่ยงที่ราคาอาจถูกแก้หรือสร้างออเดอร์ไม่ครบ

แผนระยะสั้น:

- ใช้ order เดิม แต่ endpoint สร้าง Stripe Session ต้องคำนวณยอดใหม่จากฐานข้อมูล
- ไม่ใช้ `orders.total_price` ที่ frontend ส่งมาเป็นแหล่งข้อมูลสุดท้ายสำหรับการเรียกเก็บเงิน

แผนระยะถัดไป:

- รวมการสร้าง order และ order items เป็น endpoint เดียว
- ให้ backend อ่านราคาสินค้าจากฐานข้อมูล
- ใช้ transaction หรือ batch เพื่อไม่ให้เกิด order ที่ไม่มีรายการสินค้า
- จองหรือตัด stock ด้วยกติกาที่ชัดเจนเมื่อเริ่มหรือเมื่อชำระสำเร็จ

## 10. Frontend changes

หลังสร้าง order และ order items สำเร็จ ให้เรียก:

```js
const { data } = await api.post('/payments/stripe/checkout-session', {
  orderId
})

window.location.assign(data.checkoutUrl)
```

เพิ่ม route และหน้า:

```text
/payment/success
/payment/cancel
```

หน้า success ต้อง:

- แสดงสถานะ “กำลังตรวจสอบการชำระเงิน”
- เรียก `GET /payments/stripe/status/:orderId`
- แสดงผลสำเร็จเมื่อฐานข้อมูลมีสถานะ `paid`
- แสดงปุ่มไปหน้า Orders
- ไม่เรียก API เพื่อเปลี่ยนสถานะเป็น paid

หน้า cancel ต้อง:

- แจ้งว่ายังไม่มีการชำระเงิน
- ให้ลูกค้ากลับไปลองชำระใหม่ได้
- ไม่ยกเลิก order อัตโนมัติ เว้นแต่กำหนด business rule ไว้ชัดเจน

## 11. ระบบ Manual QR เดิม

ในช่วง rollout ให้คงระบบเดิมไว้เป็น fallback โดยแสดงตัวเลือกให้ชัดเจน:

- `PromptPay ผ่าน Stripe` — Dynamic QR และยืนยันอัตโนมัติ
- `โอนธนาคารและแนบสลิป` — QR รูปภาพเดิมและแอดมินตรวจเอง

หลัง Stripe ทำงานเสถียรแล้วจึงพิจารณาปิด manual QR หรือเก็บไว้เป็นช่องทางสำรองถาวร

## 12. Security checklist

- [ ] คำนวณยอดเงินจากข้อมูลใน backend เท่านั้น
- [ ] ตรวจ ownership ของ order ก่อนสร้าง session หรือคืนสถานะ
- [ ] ตรวจว่า order ยังไม่ได้จ่ายก่อนสร้าง session
- [ ] ใช้ idempotency key เมื่อเรียก Stripe
- [ ] ตรวจ webhook signature ทุกครั้ง
- [ ] รองรับ webhook event ซ้ำโดยไม่อัปเดตซ้ำ
- [ ] ตรวจ `amount_received` และ `currency` ให้ตรงกับ order
- [ ] เปลี่ยนเป็น paid จาก webhook เท่านั้น
- [ ] ไม่ log secret key, client secret หรือข้อมูลอ่อนไหว
- [ ] แยก Test และ Live credentials
- [ ] จำกัด CORS ให้เป็น production domain ก่อนเปิดใช้งานจริง
- [ ] ตั้ง rate limit สำหรับ payment endpoints
- [ ] มี audit trail สำหรับการจ่ายและคืนเงิน

## 13. Testing plan

### Local testing

ใช้ Stripe CLI forward webhook เข้า backend:

```bash
stripe login
stripe listen --forward-to localhost:3000/payments/stripe/webhook
```

นำ `whsec_...` ที่ CLI แสดงไปตั้งใน `backend/.env` สำหรับ local session นั้น

กรณีที่ต้องทดสอบ:

- [ ] สร้าง Checkout Session สำเร็จ
- [ ] ผู้ใช้อื่นไม่สามารถจ่าย order ที่ไม่ใช่ของตน
- [ ] Backend ไม่เชื่อยอดที่ถูกแก้จาก frontend
- [ ] ชำระ PromptPay สำเร็จและ order เปลี่ยนเป็น paid
- [ ] ผู้ใช้กดยกเลิกหน้า Stripe
- [ ] Session หมดอายุ
- [ ] Stripe ส่ง webhook event เดิมซ้ำ
- [ ] Webhook signature ไม่ถูกต้อง
- [ ] ยอดหรือ currency ใน webhook ไม่ตรงกับ order
- [ ] Frontend ปิดก่อน redirect กลับ แต่ webhook ยังอัปเดต order ได้
- [ ] Refund และ partial refund
- [ ] Backend restart ระหว่างรอการชำระเงิน

### Automated tests

เพิ่ม test สำหรับ:

- amount calculation
- ownership และ authentication
- session idempotency
- webhook signature validation
- duplicate event handling
- order/payment status transitions
- mismatch ระหว่าง Stripe amount กับ order amount

Stripe SDK ควรถูก mock ใน unit/integration tests เพื่อไม่เรียก Stripe API จริง

## 14. Rollout plan

### Phase 1: Foundation

- เพิ่ม Stripe SDK และ environment variables
- เพิ่ม payment data model
- เพิ่ม Checkout Session API
- เพิ่ม webhook พร้อม signature verification
- เพิ่ม automated tests

### Phase 2: Frontend integration

- เพิ่มปุ่มชำระผ่าน Stripe PromptPay
- เพิ่ม success/cancel pages
- เพิ่มการอ่านสถานะ payment
- คง manual QR เป็น fallback

### Phase 3: Test environment

- ทดสอบ end-to-end ด้วย Stripe Test mode
- ตรวจ webhook logs และ duplicate handling
- ตรวจยอดเงินและสถานะ order ทุกกรณี

### Phase 4: Production

- เปิด PromptPay ใน Live mode
- ตั้ง Live secret key
- สร้าง production webhook endpoint และตั้ง Live webhook secret
- ทำรายการจริงยอดต่ำและตรวจ reconciliation
- Monitor webhook failures และ payment mismatch

### Phase 5: Cleanup

- ประเมินว่าจะปิด manual QR หรือเก็บเป็น fallback
- เพิ่มหน้าแอดมินสำหรับดู Stripe payment/reference
- เพิ่ม refund workflow และรายงาน reconciliation

## 15. Definition of done

งานถือว่าเสร็จเมื่อ:

- ลูกค้าสร้าง order และเปิด Stripe Checkout ได้
- Stripe แสดง PromptPay QR ในสกุล THB
- ยอดที่ Stripe เรียกเก็บคำนวณจาก backend
- การชำระสำเร็จอัปเดต order ผ่าน webhook
- Webhook ที่ปลอมหรือยอดไม่ตรงไม่สามารถ mark order เป็น paid
- Event ซ้ำไม่ทำให้เกิดการประมวลผลซ้ำ
- หน้า success แสดงสถานะจาก backend ได้
- Test suite ผ่านทั้งหมด
- มี Test/Live configuration และ deployment instructions
- ระบบเดิมยังใช้งานได้ระหว่าง rollout หรือถูกปิดตาม business decision

## 16. ลำดับ implementation ที่แนะนำ

1. ปรับ data model และเพิ่ม migration/default values
2. ติดตั้ง Stripe SDK และเพิ่ม config validation
3. ทำ webhook raw-body route ก่อน JSON middleware
4. ทำ Checkout Session endpoint พร้อม server-side price calculation
5. ทำ status endpoint
6. เพิ่ม frontend redirect และ success/cancel pages
7. เพิ่ม automated tests
8. ทดสอบ Stripe CLI และ Test mode แบบ end-to-end
9. Deploy staging และตั้ง staging webhook
10. เปิด Live mode หลัง security checklist ผ่านครบ

