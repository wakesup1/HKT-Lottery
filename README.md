# HKT Lottery - ระบบขายลอตเตอร์รี่ออนไลน์พร้อม AI

เว็บไซต์ Single-Page Application สำหรับซื้อลอตเตอร์รี่ออนไลน์ พร้อมระบบทำนายเลขด้วย AI (Google Gemini) และบันทึกข้อมูลถาวรด้วย MongoDB

## ฟีเจอร์หลัก

- **ซื้อเลขลอตเตอร์รี่**: รองรับเลขท้าย 2 ตัว, เลขหน้า 3 ตัว, เลขท้าย 3 ตัว
- **ซื้อหลายเลขพร้อมกัน**: เพิ่มหลายรายการในบิลเดียว คำนวณราคาอัตโนมัติ
- **ราคา 1 บาทต่อใบ**: ระบุจำนวนใบได้ตามต้องการ
- **ประกาศผลรางวัล**: Admin ประกาศผลได้ 2 โหมด (สุ่มอัตโนมัติ / กำหนดเอง)
- **ตรวจสอบรางวัล**: ระบบตรวจรางวัลอัตโนมัติ รองรับการถูกหลายรางวัลพร้อมกัน
- **จัดการงวด**: ผูกการซื้อกับงวดอัตโนมัติ ป้องกันความผิดพลาด
- **AI Prediction**: ใช้ Google Gemini วิเคราะห์และแนะนำเลขที่น่าสนใจ
- **ประวัติการซื้อ**: ดูรายการซื้อทั้งหมด พร้อมสถานะรางวัล
- **รายชื่อผู้ถูกรางวัล**: Admin ดูรายชื่อผู้โชคดีได้
- **UI/UX สวยงาม**: ออกแบบด้วย Bai Jamjuree Font, Gradient และ Animation
- **MongoDB Integration**: บันทึกข้อมูลถาวร ไม่หายเมื่อ restart server

## Tech Stack

### Frontend
- HTML5 / CSS3 (Flexbox, Grid, Animation)
- JavaScript (Vanilla JS - ES6+)
- Bai Jamjuree Font (Google Fonts)

### Backend
- Node.js (v20.x)
- Express.js (v4.18.2)
- MongoDB + Mongoose (v8.8.3)
- Google Gemini API (AI Integration)
- dotenv, CORS

### Database
- MongoDB Atlas (Cloud) / Local MongoDB
- Collections: Purchases, LotteryResults, Draws

### Deployment
- AWS EC2 (Ubuntu 22.04)
- PM2 (Process Manager)
- Nginx (Reverse Proxy)

## ข้อกำหนดเบื้องต้น

- Node.js >= 18.x
- MongoDB (Atlas หรือ Local)
- Gemini API Key (ฟรีที่ https://ai.google.dev/)
- AWS Account (สำหรับ production deployment)

## การติดตั้ง (Local Development)

### 1. Clone โปรเจค

```bash
git clone https://github.com/wakesup1/HKT-Lottery.git
cd HKT-Lottery
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า MongoDB

**Option 1: MongoDB Atlas (แนะนำ - ฟรี)**
- ดูคู่มือใน `MONGODB_ATLAS_SETUP.md`
- สร้าง M0 FREE cluster (512MB)
- คัดลอก Connection String

**Option 2: Local MongoDB**
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongodb
```

### 4. ตั้งค่า Environment Variables

สร้างไฟล์ `.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lottery
# หรือ MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lottery

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

**วิธีรับ Gemini API Key:**
1. ไปที่ https://ai.google.dev/
2. คลิก "Get API Key"
3. สร้าง API Key ใหม่ (ฟรี)
4. คัดลอกและใส่ใน `.env`

### 5. รัน Database Migration

```bash
npm run migrate
```

จะสร้างข้อมูลเริ่มต้น:
- งวดแรก (Draw)
- Collections ใน MongoDB

### 6. รันโปรเจค

```bash
# เข้าไปใน backend directory
cd backend

# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

### 7. เปิดเว็บไซต์

```
http://localhost:3000
```

หมายเหตุ: Backend จะ serve frontend อัตโนมัติที่ path `/`

## โครงสร้างโปรเจค

```
HKT-Lottery/
├── backend/                  # Backend API Server
│   ├── config/
│   │   └── database.js       # MongoDB connection
│   ├── models/
│   │   ├── Purchase.js       # Purchase schema
│   │   ├── LotteryResult.js  # Result schema
│   │   └── Draw.js           # Draw schema
│   ├── server.js             # Express server
│   ├── migrate.js            # Database initialization
│   ├── package.json          # Backend dependencies
│   └── README.md             # Backend documentation
│
├── frontend/                 # Frontend Application
│   ├── index.html            # Main HTML
│   ├── app.js                # JavaScript logic
│   ├── styles.css            # Styling
│   ├── src/                  # Images & assets
│   └── README.md             # Frontend documentation
│
├── .env                      # Environment variables (create this)
├── .gitignore                # Git ignore rules
├── package.json              # Root package.json
├── README.md                 # Main documentation
├── DEPLOYMENT.md             # AWS EC2 deployment guide
└── MONGODB_ATLAS_SETUP.md    # MongoDB Atlas setup guide
```

## API Endpoints

### GET /api/results
ดูผลรางวัลล่าสุด พร้อมรายละเอียดงวดที่ประกาศและงวดที่เปิดให้ซื้อปัจจุบัน

**Response:**
```json
{
  "success": true,
  "data": {
    "drawId": "DRAW-0003",
    "drawLabel": "งวดประจำวันที่ 16 พฤศจิกายน 2567",
    "drawSequence": 3,
    "drawDate": "2024-11-16T12:00:00.000Z",
    "firstPrize": "123456",
    "threeDigitFront": ["123", "456"],
    "threeDigitBack": ["789", "012"],
    "twoDigitBack": "34",
    "lastUpdate": "2024-11-16T12:05:00.000Z",
    "story": "อัลกอริทึม Stardust Mixer v2 ...",
    "inspiration": "เทศกาลสงกรานต์",
    "chaosLevel": 0.62,
    "algorithm": "Stardust Mixer v2"
  },
  "currentDraw": {
    "id": "DRAW-0004",
    "label": "งวดประจำวันที่ 1 ธันวาคม 2567",
    "sequence": 4,
    "date": "2024-12-01T00:00:00.000Z"
  }
}
```

### POST /api/results
ประกาศผลรางวัล (Admin only) โดยให้ระบบสุ่มเลขให้อัตโนมัติ

**Request Body (ออปชัน)**
```json
{
  "inspiration": "แรงบันดาลใจหรือธีมงวดนี้",
  "chaosLevel": 0.5
}
```

`chaosLevel` คือค่าระหว่าง `0` ถึง `1` (หรือ 0-100% บน UI) ที่บอกระดับความคาดเดาไม่ได้ของผลสุ่ม หากไม่ใส่ระบบจะใช้ค่า `0.5` เป็นค่ากลาง ระบบจะประกาศผลให้กับงวดปัจจุบันและเลื่อนงวดถัดไปให้อัตโนมัติ

### POST /api/purchase
ซื้อเลข 2-3 ตัวแบบหลายรายการในบิลเดียว (เชื่อมกับงวดปัจจุบันโดยอัตโนมัติ)

**Request Body:**
```json
{
  "customerName": "ชื่อลูกค้า",
  "entries": [
    {
      "numberType": "twoDigitBack",
      "number": "25",
      "amount": 5
    },
    {
      "numberType": "threeDigitBack",
      "number": "789",
      "amount": 2
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "ซื้อลอตเตอร์รี่สำเร็จ",
  "data": {
    "id": 1699999999,
    "drawId": "DRAW-0004",
    "drawLabel": "งวดประจำวันที่ 1 ธันวาคม 2567",
    "customerName": "ชื่อลูกค้า",
    "entries": [
      {
        "id": 1699999999,
        "numberType": "twoDigitBack",
        "number": "25",
        "amount": 5,
        "price": 1,
        "totalPrice": 5,
        "status": "pending",
        "label": "เลขท้าย 2 ตัว",
        "prizeLabel": "รางวัลเลขท้าย 2 ตัว"
      },
      {
        "id": 1699999999,
        "numberType": "threeDigitBack",
        "number": "789",
        "amount": 2,
        "price": 1,
        "totalPrice": 2,
        "status": "pending",
        "label": "เลขท้าย 3 ตัว",
        "prizeLabel": "รางวัลเลขท้าย 3 ตัว"
      }
    ],
    "totalPrice": 7,
    "purchaseDate": "2024-11-06T...",
    "status": "pending"
  }
}
```

### PUT /api/purchase/:id
แก้ไขชื่อผู้ซื้อหรือปรับเลขที่เลือกได้ก่อนที่จะประกาศผลงวดนั้น (รองรับการส่งทั้งสองอย่างหรืออย่างใดอย่างหนึ่ง)

**Request Body (ตัวอย่าง):**
```json
{
  "customerName": "ชื่อใหม่",
  "entries": [
    {
      "numberType": "twoDigitBack",
      "number": "57",
      "amount": 2
    }
  ]
}
```

### DELETE /api/purchase/:id
ยกเลิกรายการซื้อที่ยังอยู่สถานะ `pending` และยังไม่ประกาศผลรางวัลของงวดนั้น

รองรับ `numberType` ค่าเดียวกับหน้าเว็บ ได้แก่ `twoDigitBack`, `threeDigitFront`, `threeDigitBack`

### GET /api/purchases
ดูรายการซื้อทั้งหมด (แต่ละรายการบอกงวดที่ซื้อและรายการเลขย่อยทั้งหมด)

### POST /api/check-winning
ตรวจสอบว่าถูกรางวัลหรือไม่ (ต้องเป็นงวดเดียวกับที่ประกาศผล)

**Request Body:**
```json
{
  "purchaseId": 1699999999
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isWin": true,
    "prize": "รางวัลเลขท้าย 2 ตัว",
    "winningEntries": [
      {
        "number": "25",
        "prize": "รางวัลเลขท้าย 2 ตัว"
      }
    ],
    "draw": {
      "id": "DRAW-0003",
      "label": "งวดประจำวันที่ 16 พฤศจิกายน 2567"
    },
    "purchase": {
      "...": "รายละเอียดการซื้อพร้อมสถานะของแต่ละเลข"
    }
  }
}
```

### POST /api/predict
ทำนายเลข 2-3 ตัวด้วย AI

**Request Body:**
```json
{
  "userInput": "ข้อมูลเพิ่มเติมจากผู้ใช้ (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prediction": "การวิเคราะห์และคำแนะนำจาก AI...",
    "suggestedTwoDigit": ["25", "78", "34"],
    "suggestedThreeDigit": ["123", "456", "789"],
    "timestamp": "2024-11-06T..."
  }
}
```

## วิธีใช้งาน

### 1. ซื้อเลขลอตเตอร์รี่
1. คลิกแท็บ "ซื้อลอตเตอร์รี่"
2. ตรวจสอบงวดที่เปิดให้ซื้อในกล่อง "งวดที่เปิดให้ซื้อ"
3. กรอกชื่อ-นามสกุลผู้ซื้อ
4. ใช้ปุ่ม "เพิ่มเลข" เพื่อเพิ่มรายการแต่ละชุด:
   - เลือกประเภทเลข (เลขท้าย 2 ตัว / เลขหน้า 3 ตัว / เลขท้าย 3 ตัว)
   - กรอกเลขให้ครบตามจำนวนหลักที่กำหนด
   - ระบุจำนวนใบ (ระบบคำนวณราคารวมให้อัตโนมัติ)
5. เพิ่มหลายเลขในบิลเดียวได้ตามต้องการ หรือกดปุ่มลบเพื่อลบรายการที่ไม่ต้องการ
6. กด "ซื้อเลย" เพื่อบันทึกการซื้อ
7. รายการซื้อและยอดรวมจะแสดงในแผงด้านขวา

### 2. ดูผลรางวัล
1. คลิกแท็บ "ผลรางวัล"
2. ดูผลรางวัลที่ประกาศ (รางวัลที่ 1, เลขหน้า 3 ตัว, เลขท้าย 3 ตัว, เลขท้าย 2 ตัว)

### 3. ตรวจสอบรางวัล
1. ไปที่แท็บ "ซื้อลอตเตอร์รี่"
2. คลิกที่รายการซื้อของคุณในส่วน "รายการซื้อของคุณ"
3. ระบบจะตรวจสอบและแสดงผลว่าถูกรางวัลหรือไม่

### 4. ทำนายเลขด้วย AI
1. คลิกแท็บ "ทำนายเลขด้วย AI"
2. กรอกข้อมูลเพิ่มเติม (ถ้ามี) เช่น:
   - เลขที่ชอบ
   - งวดที่แล้วออกอะไร
   - วันเกิด
   - ความฝัน
3. กดปุ่ม "ทำนายเลขด้วย AI"
4. รอระบบวิเคราะห์และแสดงเลขแนะนำ 2 ตัวและ 3 ตัว พร้อมคำอธิบาย

### 5. ประกาศผลรางวัล (Admin)
1. คลิกแท็บ "ประกาศผล (Admin)"
2. เลือกโหมดประกาศผล: สุ่มอัตโนมัติ หรือ กำหนดเอง
3. (ออปชัน) ใส่แรงบันดาลใจหรือธีมของงวดเพื่อให้ระบบปรับน้ำหนักเลข
4. ปรับสไลเดอร์ "ระดับความคาดเดาไม่ได้" ตามความต้องการ
5. กด "สุ่มประกาศผล" เพื่อให้ Stardust Mixer ประกาศผลงวดปัจจุบันและเปิดงวดถัดไปอัตโนมัติ

## Database Schema

### Purchases Collection
```javascript
{
  drawId: String,           // เชื่อมโยงกับงวด
  customerName: String,
  entries: [{
    numberType: String,     // 'twoDigitBack', 'threeDigitFront', 'threeDigitBack'
    number: String,
    amount: Number,
    status: String          // 'pending', 'win', 'lose'
  }],
  totalPrice: Number,
  purchaseDate: Date,
  status: String            // 'pending', 'win', 'lose'
}
```

### LotteryResults Collection
```javascript
{
  drawId: String,
  firstPrize: String,        // 6 หลัก
  threeDigitFront: [String], // Array of 3-digit numbers
  threeDigitBack: [String],  // Array of 3-digit numbers
  twoDigitBack: String,      // 2 หลัก
  isLocked: Boolean,
  drawDate: Date,
  story: String,
  inspiration: String,
  chaosLevel: Number,
  algorithm: String
}
```

### Draws Collection
```javascript
{
  id: String,               // DRAW-0001
  sequence: Number,
  drawDate: Date,
  status: String            // 'active', 'announced'
}
```

## Available Scripts

```bash
# Development
npm run dev              # Start with nodemon (auto-reload)
npm start                # Start production server

# Database
npm run migrate          # Initialize database with first draw

# PM2 (Production)
npm run pm2:start        # Start with PM2
npm run pm2:restart      # Restart application
npm run pm2:stop         # Stop application
npm run pm2:logs         # View logs
```

## Production Deployment

ดูคู่มือการ Deploy แบบละเอียดใน:
- `DEPLOYMENT.md` - AWS EC2 deployment guide
- `MONGODB_ATLAS_SETUP.md` - MongoDB Atlas setup

### Quick Deploy Steps

1. **Setup MongoDB Atlas** (ฟรี 512MB)
2. **Launch AWS EC2** (t2.micro - Free Tier)
3. **Install Node.js, PM2, Nginx**
4. **Clone & Setup**
   ```bash
   git clone https://github.com/wakesup1/HKT-Lottery.git
   cd HKT-Lottery
   npm install
   ```
5. **Configure .env** (production values)
6. **Run migration**: `npm run migrate`
7. **Start with PM2**: `pm2 start server.js --name lottery-app`
8. **Setup Nginx** reverse proxy
9. **Access**: `http://YOUR_EC2_IP`

## Security Best Practices

- **Never commit `.env`** with API keys
- Use `.gitignore` properly
- Add authentication for production
- Limit MongoDB Atlas IP whitelist
- Use HTTPS in production (Let's Encrypt)
- Implement rate limiting for APIs
- Validate all user inputs
- Use helmet.js for Express security

## Notes & Disclaimer

- การทำนายด้วย AI เป็นเพียงความบันเทิง ไม่รับประกันความถูกต้อง
- โปรเจคนี้เป็น demo/educational purpose เท่านั้น
- สำหรับ production จริง ควรเพิ่ม:
  - User authentication (JWT, OAuth)
  - Payment gateway integration
  - Email notifications
  - Admin dashboard
  - Audit logging
  - Backup system

## Troubleshooting

### Common Issues

**1. MongoDB connection error**
```bash
# Check connection string in .env
# Verify IP whitelist in MongoDB Atlas
# Test connection:
node -e "require('mongoose').connect('your-uri').then(() => console.log('OK'))"
```

**2. API not responding**
```bash
# Check if server is running
pm2 status

# View logs
pm2 logs lottery-app

# Check port
sudo lsof -i :3000
```

**3. Frontend not loading**
- Check browser console for errors
- Verify API_URL in `public/app.js`
- Clear browser cache

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

## License

MIT License

## Author

Developed with AI assistance

## Support

- Check `DEPLOYMENT.md` for deployment issues
- Review server logs: `pm2 logs lottery-app`
- Open an issue on GitHub

---

**HKT Lottery** - ระบบขายลอตเตอร์รี่ออนไลน์พร้อม AI
