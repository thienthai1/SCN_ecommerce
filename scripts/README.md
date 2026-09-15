# จัดการแอปในเครื่อง

ใช้จากโฟลเดอร์โปรเจกต์ บน Linux ที่มี Bash, Python 3.8+, Node.js 22.13+ และ npm:

```bash
./app.sh start        # เริ่ม backend, frontend และ mockup
./app.sh status       # ดูสถานะทุกแอป
./app.sh restart      # หยุดแล้วเริ่มทุกแอปใหม่
./app.sh stop         # หยุดทุกแอป
```

เลือกแอปได้ด้วย argument ตัวที่สอง:

```bash
./app.sh start backend
./app.sh start frontend
./app.sh restart backoffice
./app.sh stop mockup
./app.sh status all
```

`backoffice` เป็นชื่อแทน `frontend` เพราะใช้ Quasar โปรเซสเดียวกัน
เข้า backoffice ที่ `/admin/login` บน URL ของ frontend
`all` รวม mockup ด้วย ส่วน `ScnShop` เป็นชุดคำขอ API ของ Bruno ไม่มี server ให้เปิด

## เตรียมครั้งแรก

```bash
npm --prefix backend install
npm --prefix frontend install
npm --prefix mockup install
```

Backend สร้าง SQLite และโฟลเดอร์เก็บรูปในเครื่องเอง ไม่ต้องใช้ Firebase key
สร้างแอดมินครั้งแรกด้วย:

```bash
npm --prefix backend run create-admin
```

อ่านการตั้งค่าและวิธีสำรองข้อมูลใน [คู่มือ backend](../backend/README.md)
สคริปต์ไม่ติดตั้ง dependencies ให้อัตโนมัติ
Backend ใช้ `npm start`; frontend และ mockup ใช้ `npm run dev`
จึงเหมาะกับการพัฒนาในเครื่อง ไม่ใช่บริการ production หรือระบบเริ่มอัตโนมัติหลัง reboot

## Logs และสถานะ

```bash
tail -f .run/backend.log
tail -f .run/frontend.log
tail -f .run/mockup.log
```

ดู URL/port ของ frontend และ mockup จาก log; backend ใช้ port 3000 เป็นค่าเริ่มต้น
การตั้งค่า URL และ port ยังใช้ config/environment เดิมของแต่ละแอป
Logs ถูกเขียนต่อท้าย ไม่ลบเมื่อ restart และยังไม่มี log rotation

- `start` ซ้ำจะไม่เปิดโปรเซสใหม่ หากแอปนั้นยังทำงานอยู่
- ตรวจ dependencies และเวอร์ชัน Node ของแอปที่จะเริ่มก่อนเปลี่ยนสถานะ
- หากแอปออกระหว่างช่วงตรวจเริ่มต้น 2 วินาที จะแจ้ง error และหยุดแอปที่เพิ่งเริ่มในคำสั่งนั้น
- `restart` หยุดก่อนเริ่มใหม่ หากเริ่มล้มเหลวจะไม่คืนโปรเซสเดิม
- `stop` ส่ง SIGTERM ไปยัง process group ของแอป รอสูงสุด 10 วินาที แล้วใช้ SIGKILL หากจำเป็น
- จัดการเฉพาะโปรเซสที่สคริปต์สร้างไว้ ไม่หยุดแอปที่เปิดเองใน terminal อื่น
- `RUNNING` หมายถึงโปรเซสยังอยู่ ไม่ได้ยืนยันว่า HTTP/API/ฐานข้อมูลพร้อมใช้งาน
- `status` คืน exit code 0 เมื่อทุกแอปที่เลือกทำงานอยู่ และ 1 เมื่อมีแอปหยุดอยู่
- คำสั่งไม่ถูกต้องคืน exit code 2; การเริ่ม/หยุดล้มเหลวคืน 1

ไฟล์สถานะและ log อยู่ใน `.run/` ซึ่งถูก ignore จาก Git
