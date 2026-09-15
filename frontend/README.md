# Frontend / Backoffice

Vue + Quasar PWA. ใช้ API และไฟล์รูปจาก backend บนเซิร์ฟเวอร์นี้

```bash
npm ci
npm run dev
npm run build
```

เข้า backoffice ที่ `/admin/login` และสร้างแอดมินด้วยคำสั่งใน
[คู่มือ backend](../backend/README.md)

ค่าเริ่มต้นเรียก `/api` บน origin เดียวกับ frontend และ proxy ไป
`http://127.0.0.1:3000` ระหว่าง development รวมถึง proxy รูปที่ `/uploads`
ดู `.env.example` หากต้องเปลี่ยน port/backend URL

Build อยู่ที่ `dist/pwa` สำหรับ self-hosting และต้องตั้ง reverse proxy สำหรับ API/uploads
ตามคู่มือ backend
