# Backend บนเซิร์ฟเวอร์ของร้าน

ระบบใช้ SQLite และเก็บรูปบนดิสก์ ไม่ต้องมีบัญชี Firebase, service-account key,
Google Cloud Scheduler หรือ Redis ค่าเริ่มต้นรันได้โดยไม่สร้าง `.env`

## เริ่มใช้งาน

ต้องใช้ Node.js **22.13 ขึ้นไป** ที่รองรับ `node:sqlite` (Dockerfile ใช้ Node 22)

จากโฟลเดอร์รากโปรเจกต์:

```bash
npm --prefix backend ci
npm --prefix backend run create-admin
./app.sh start
```

คำสั่ง `create-admin` สร้างผู้ใช้ชื่อ `admin` และถามรหัสผ่านอย่างน้อย 12 ตัวอักษร
โดยไม่แสดงรหัสผ่านขณะพิมพ์ ไม่มีรหัสผ่านเริ่มต้น และไม่แก้ผู้ใช้ชื่อเดิมถ้ามีอยู่แล้ว
ต้องการชื่ออื่นใช้ `ADMIN_USERNAME=owner npm --prefix backend run create-admin`
งานอัตโนมัติสามารถส่ง `ADMIN_PASSWORD` ผ่าน environment ที่จัดการอย่างปลอดภัยได้

เข้า `/admin/login` บน frontend; สมัครสมาชิกทั่วไปได้จากหน้าร้าน
ฐานข้อมูลเริ่มต้นว่าง สินค้า ออเดอร์ สมาชิก รูป และตารางแจ้งเตือนเดิมบน Firebase
**ไม่ได้ถูกนำเข้ามา** การย้ายข้อมูลเดิมต้องมีไฟล์ export หรือสิทธิ์เข้าถึงแหล่งเดิมก่อน

## ไฟล์ถาวร

| ตำแหน่งเริ่มต้น | ข้อมูล |
|---|---|
| `backend/data/shop.sqlite` | สมาชิก สิทธิ์ สินค้า ออเดอร์ การชำระเงิน และงานตั้งเวลา |
| `backend/data/shop.sqlite-wal`, `shop.sqlite-shm` | ไฟล์ประกอบ SQLite ขณะทำงาน |
| `backend/data/jwt-secret` | คีย์ลงชื่อ login token ที่สร้างในเครื่องครั้งแรก |
| `backend/uploads/` | รูปสินค้า หมวดหมู่ แบนเนอร์ QR และสลิป |

`stop` และ `restart` ไม่ลบข้อมูลเหล่านี้ และไฟล์ถูก ignore จาก Git
ตัว repository เก็บเอกสาร JSON ลงตาราง `documents` ของ SQLite เพื่อคงโครงสร้าง API เดิม
มี transaction สำหรับ batch updates และ unique indexes ของ username/เบอร์โทร
query ที่ค้นหาภายในเอกสารจะอ่านข้อมูลใน collection จึงเหมาะกับร้านขนาดเล็กบนเซิร์ฟเวอร์เดียว
หากข้อมูลเพิ่มมากควรเพิ่ม indexes/query SQL สำหรับงานนั้นโดยตรง

## การตั้งค่าและ URL

ดู `.env.example` แล้วสร้าง `backend/.env` หากต้องปรับ path หรือ port
ตัวแปร `DATA_DIR`, `DATABASE_PATH`, `UPLOAD_DIR` รองรับ absolute path
JWT key จะสร้างให้ในเครื่องอัตโนมัติ หรือกำหนด `JWT_SECRET` เองได้
การลบ/เปลี่ยน key จะทำให้ token เดิมใช้ไม่ได้

- `GET /health` ตรวจ SQLite และบอกชนิด storage
- รูปถูกส่งจาก `/uploads/...` รองรับ PNG, JPEG, GIF และ WebP
- URL รูปเริ่มต้นเป็น relative path; frontend dev proxy ส่ง `/uploads` ไป backend
- ถ้า frontend/backend แยกโดเมน ให้ตั้ง `PUBLIC_API_URL` เป็น origin ของ backend
- frontend dev proxy ส่ง `/api/...` ไป backend โดยตัด `/api` ตัวแรกออก
- โหมด production ต้องตั้ง reverse proxy แบบเดียวกัน: `/api/` → backend `/`,
  `/uploads/` → backend `/uploads/` และเสิร์ฟ `frontend/dist/pwa` พร้อม SPA fallback
- ถ้าตั้ง `PORT` ใหม่ ให้ตั้ง `DEV_API_TARGET` ใน `frontend/.env` ให้ตรงกัน

Omise เป็นบริการชำระเงินภายนอกที่แยกจาก Firebase หากยังไม่ได้ตั้ง `OMISE_SECRET_KEY`
เฉพาะ endpoints `/api/payments/omise/*` จะคืน 503 ส่วนระบบร้านและอัปโหลดสลิปยังทำงานได้
LINE login และ browser push ยังคงเป็น integrations เดิม ต้องตั้งค่าของบริการเหล่านั้นหากใช้งาน

## ตั้งเวลาการแจ้งเตือน

หน้า backoffice ใช้ `/scheduler/create-job`, `/scheduler/jobs`,
`/scheduler/delete-job/:jobId` ส่วน `/clould-scheduler/...` เป็น alias สำหรับ client เดิม
ไม่มี callback จาก Google และไม่ต้องตั้ง `CLOUD_SCHEDULER_SECRET`

รองรับ `runAt` สำหรับครั้งเดียว และ cron พร้อม `timeZone` สำหรับงานซ้ำ
worker ใน backend ตรวจงานทุกวินาทีและเก็บสถานะใน SQLite
ให้รัน backend **หนึ่งโปรเซสต่อฐานข้อมูล** งานที่ยัง pending จะอยู่ต่อหลัง restart
งานครั้งเดียวที่เลยกำหนดระหว่างปิดเครื่องจะทำเมื่อเริ่มใหม่
งาน cron ที่พลาดหลายรอบจะทำหนึ่งครั้งแล้วคำนวณรอบถัดไป
งานที่ยกเลิกจะไม่ส่ง งานที่ประมวลผลผิดพลาดจะเก็บสถานะ failed ในฐานข้อมูล
หากโปรเซสล่มระหว่างส่ง push อาจส่งซ้ำเมื่อกู้คืนงานได้

## สำรองข้อมูล

หยุด backend ก่อน archive เพื่อให้ฐานข้อมูลกับรูปเป็นชุดเดียวกัน:

```bash
./app.sh stop backend
tar -czf shop-backup.tar.gz backend/data backend/uploads
./app.sh start backend
```

เก็บ archive ไว้นอก Git/นอกเว็บรูท และสำรองออกจากเซิร์ฟเวอร์ด้วย
หากกำหนด path เอง ให้สำรอง path เหล่านั้นแทน
ตอน restore ให้หยุด backend แล้วนำทั้งฐานข้อมูล รูป และ jwt-secret กลับมาด้วย
Docker ต้อง mount persistent volumes ที่ `/app/data` และ `/app/uploads`

## ตรวจสอบ

```bash
npm --prefix backend test
npm --prefix frontend run build
```

Tests ใช้โฟลเดอร์ชั่วคราว ไม่เขียนข้อมูลทดสอบลงฐานข้อมูลร้าน
ครอบคลุม SQLite persistence, query/timestamps, batch rollback, ความปลอดภัย path ของ uploads,
สมาชิก/แอดมิน, สินค้า, หมวดหมู่, แบนเนอร์, ที่อยู่, ออเดอร์, สลิป,
และการตั้งเวลา/ยกเลิก/กู้คืนหลัง restart
ไม่ได้ทดสอบการรับเงินจริงผ่าน Omise หรือส่ง push/LINE จริง

Implementation references: [Node SQLite](https://nodejs.org/api/sqlite.html),
[cron-parser](https://github.com/harrisiirak/cron-parser).
