# Backend - HKT Lottery API

Node.js + Express + MongoDB backend API สำหรับระบบขายลอตเตอร์รี่ออนไลน์

## โครงสร้าง

```
backend/
├── config/
│   └── database.js       # MongoDB connection
├── models/
│   ├── Purchase.js       # Purchase schema
│   ├── LotteryResult.js  # Result schema
│   └── Draw.js           # Draw schema
├── server.js             # Main Express server
├── migrate.js            # Database initialization
├── package.json          # Dependencies
└── .env.example          # Environment template
```

## การติดตั้ง

```bash
cd backend
npm install
```

## การตั้งค่า

สร้างไฟล์ `.env` ใน root directory (ไม่ใช่ใน backend/):

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/lottery
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

## การรัน

```bash
# Development
cd backend
npm run dev

# Production
npm start

# Database migration
npm run migrate
```

## API Endpoints

### Public APIs
- `GET /api/results` - ดูผลรางวัล
- `POST /api/purchase` - ซื้อลอตเตอร์รี่
- `GET /api/purchases` - ดูรายการซื้อ
- `POST /api/check-winning` - ตรวจสอบรางวัล
- `POST /api/predict` - ทำนายเลขด้วย AI

### Admin APIs
- `POST /api/results` - ประกาศผลรางวัล
- `GET /api/winners` - ดูรายชื่อผู้ถูกรางวัล

## Dependencies

- express - Web framework
- mongoose - MongoDB ODM
- @google/generative-ai - Gemini AI
- cors - Cross-origin resource sharing
- dotenv - Environment variables
- body-parser - Request body parsing

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/lottery |
| GEMINI_API_KEY | Google Gemini API key | - |
| GEMINI_MODEL | Gemini model name | gemini-2.5-flash |

## Database Models

### Purchase
- drawId, customerName, entries[], totalPrice, status

### LotteryResult
- drawId, firstPrize, threeDigitFront[], threeDigitBack[], twoDigitBack

### Draw
- id, sequence, drawDate, status
