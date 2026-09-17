# จัดการแอปในเครื่อง

ใช้จากโฟลเดอร์โปรเจกต์ บน Linux ที่มี Bash, Python 3.8+, Node.js 22.13+ และ npm:

```bash
./app.sh start        # เริ่ม backend, frontend และ mockup
./app.sh status       # ดูสถานะทุกแอป
./app.sh restart      # หยุดแล้วเริ่มทุกแอปใหม่
./app.sh stop         # หยุดทุกแอป
./app.sh deploy       # ทดสอบ, build, restart backend และ deploy frontend production
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

## Deploy production

คำสั่งหลักสำหรับโดเมน production:

```bash
./app.sh deploy          # backend + frontend
./app.sh deploy backend  # test และ restart backend เท่านั้น
./app.sh deploy frontend # build และ sync frontend เท่านั้น
```

`deploy` จะทำตามลำดับดังนี้:

1. ตรวจ Node/npm และ dependencies
2. รัน backend tests (เมื่อ deploy backend)
3. build Quasar PWA (เมื่อ deploy frontend)
4. restart backend ผ่าน process manager
5. sync `frontend/dist/pwa/` ไป `/var/www/scn-emarket/` ด้วย `rsync --delete`
6. ตรวจ `https://scn-emarket.kotrdev.com/api/health`

หาก target ต้องใช้สิทธิ์ root สคริปต์จะเรียก `sudo` และถามรหัสผ่านใน terminal
สามารถเปลี่ยนปลายทางและ health URL ได้โดยไม่แก้โค้ด:

```bash
FRONTEND_DEPLOY_DIR=/absolute/web/root \
DEPLOY_HEALTH_URL=https://shop.example.com/api/health \
./app.sh deploy
```

ตั้ง `DEPLOY_HEALTH_URL=` เป็นค่าว่างเมื่อต้องการข้าม health check
สคริปต์ปฏิเสธ target กว้างหรืออันตราย เช่น `/`, `/var`, `/var/www` และ project root

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
คำสั่ง lifecycle ใช้ `npm start` สำหรับ backend และ `npm run dev` สำหรับ frontend/mockup
ส่วน `deploy` ใช้ production PWA build และ web root ที่กำหนดไว้ แต่ backend process manager นี้ยังไม่เริ่มเองหลัง reboot

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
