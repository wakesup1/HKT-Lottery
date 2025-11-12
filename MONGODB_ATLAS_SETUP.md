# MongoDB Atlas Setup Guide

## ขั้นตอนการสร้าง MongoDB Atlas Cluster

### 1. สมัครบัญชี MongoDB Atlas

1. ไปที่ https://www.mongodb.com/cloud/atlas/register
2. สมัครด้วย Google/GitHub หรือ Email (ฟรี)
3. เลือก **M0 FREE** tier (512 MB Storage)

### 2. สร้าง Cluster

1. กด **"Build a Database"**
2. เลือก **FREE** (Shared - M0 FREE)
3. เลือก Cloud Provider & Region:
   - **Provider**: AWS
   - **Region**: เลือกที่ใกล้ที่สุด (เช่น Singapore ap-southeast-1)
4. กด **"Create"**

### 3. สร้าง Database User

1. ไปที่ **Database Access** (เมนูซ้าย)
2. กด **"Add New Database User"**
3. เลือก **Password** authentication
4. ใส่:
   - **Username**: `lotteryAdmin`
   - **Password**: (สร้างรหัสผ่านที่ปลอดภัย - จด/คัดลอกไว้!)
5. **Database User Privileges**: `Atlas admin`
6. กด **"Add User"**

### 4. Allow Network Access

1. ไปที่ **Network Access** (เมนูซ้าย)
2. กด **"Add IP Address"**
3. เลือก **"Allow Access from Anywhere"** (0.0.0.0/0)
   - สำหรับ Development/Testing
   - Production: ควรจำกัดเฉพาะ IP ของ Server
4. กด **"Confirm"**

### 5. Get Connection String

1. กลับไปที่ **Database** (เมนูซ้าย)
2. กด **"Connect"** ของ Cluster
3. เลือก **"Drivers"**
4. เลือก **Node.js** และ version **6.9 or later**
5. คัดลอก Connection String:

```
mongodb+srv://lotteryAdmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

 **สำคัญ**: แทนที่ `<password>` ด้วยรหัสผ่านจริง!

### 6. อัปเดต .env

แก้ไขไฟล์ `.env`:

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://lotteryAdmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/lottery?retryWrites=true&w=majority

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Server
PORT=3000
NODE_ENV=development
```

**ตัวอย่างจริง**:
```env
MONGODB_URI=mongodb+srv://lotteryAdmin:MySecurePass123@cluster0.abcde.mongodb.net/lottery?retryWrites=true&w=majority
```

### 7. ทดสอบการเชื่อมต่อ

```bash
# Run migration
npm run migrate

# ถ้าสำเร็จจะเห็น:
# MongoDB เชื่อมต่อสำเร็จ: cluster0-shard-00-01.xxxxx.mongodb.net
# ลบข้อมูลเก่าเรียบร้อย
# สร้างงวดแรกเรียบร้อย
```

### 8. Start Server

```bash
npm run dev
```

เปิดเบราว์เซอร์: http://localhost:3000

---

## ข้อดีของ MongoDB Atlas

- **ฟรี 512MB** - เพียงพอสำหรับ development
- **ไม่ต้องติดตั้งอะไรบนเครื่อง**
- **Backup อัตโนมัติ**
- **Monitoring & Alerts**
- **พร้อม deploy production** ทันที
- **เข้าถึงได้จากทุกที่** (ผ่าน Internet)

---

## Troubleshooting

### Connection Timeout

**สาเหตุ**: IP ไม่ได้รับอนุญาต

**แก้ไข**:
1. ไปที่ Network Access
2. เพิ่ม IP หรือเลือก "Allow from Anywhere"

### Authentication Failed

**สาเหตุ**: Username/Password ผิด

**แก้ไข**:
1. ตรวจสอบ username ใน Database Access
2. ตรวจสอบ password ใน .env (ไม่มี < >)
3. ลองรีเซ็ต password ใน Database Access

### Cannot connect to server

**สาเหตุ**: Connection string ผิด

**แก้ไข**:
1. ตรวจสอบว่ามี `/lottery` ท้าย connection string
2. ตรวจสอบไม่มี space หรือ newline ใน .env

---

## ดู Database ใน Atlas

1. ไปที่ **Database** → **Collections**
2. จะเห็น:
   - `draws` - รายการงวด
   - `purchases` - การซื้อ
   - `lotteryresults` - ผลรางวัล

---

## ค่าใช้จ่าย

- **M0 FREE**: ฟรีตลอดกาล (512 MB)
- **M2 Shared**: $9/เดือน (2 GB) - สำหรับ Production เล็ก
- **M10 Dedicated**: $57/เดือน (10 GB) - สำหรับ Production จริง

สำหรับเว็บนี้ **M0 FREE เพียงพอแล้ว**

---

## การใช้งานใน Production

ใน `.env` production:

```env
# Production MongoDB Atlas
MONGODB_URI=mongodb+srv://prodUser:STRONG_PASSWORD@cluster0.xxxxx.mongodb.net/lottery_production?retryWrites=true&w=majority
NODE_ENV=production
```

**Security Best Practices**:
- ใช้ username/password แยกจาก development
- จำกัด Network Access เฉพาะ IP ของ EC2
- Enable **Require Authentication**
- Setup **Backup Schedule**
