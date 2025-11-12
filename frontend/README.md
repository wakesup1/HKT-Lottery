# Frontend - HKT Lottery

Vanilla JavaScript Single Page Application สำหรับระบบขายลอตเตอร์รี่ออนไลน์

## โครงสร้าง

```
frontend/
├── index.html        # Main HTML file
├── app.js            # JavaScript logic
├── styles.css        # CSS styling
└── src/              # Static assets (images)
    ├── lottery.png
    ├── trophy.png
    ├── generative.png
    ├── backend.png
    ├── buy.png
    ├── checklist.png
    └── hourglass.png
```

## เทคโนโลยี

- HTML5
- CSS3 (Flexbox, Grid, Animation)
- Vanilla JavaScript (ES6+)
- Bai Jamjuree Font (Google Fonts)

## Features

- ซื้อเลขลอตเตอร์รี่ (2-3 ตัว)
- ดูผลรางวัล
- ตรวจสอบรางวัล
- ทำนายเลขด้วย AI
- ประกาศผลรางวัล (Admin)
- Responsive Design

## การใช้งาน

### Development
ใช้ Live Server หรือ HTTP server:

```bash
# Python
cd frontend
python -m http.server 8000

# Node.js
npx serve frontend

# VS Code Live Server
# คลิกขวา index.html > Open with Live Server
```

### Production
Backend จะ serve frontend อัตโนมัติที่ root path (`/`)

## การตั้งค่า API URL

แก้ไขใน `app.js`:

```javascript
// Development
const API_URL = 'http://localhost:3000/api';

// Production
const API_URL = 'http://YOUR_SERVER_IP/api';
// หรือ
const API_URL = '/api'; // ถ้า frontend อยู่ที่เดียวกับ backend
```

## โครงสร้าง JavaScript

### app.js ประกอบด้วย:

- **Tab Management**: จัดการแท็บต่างๆ
- **Number Entry**: ระบบเลือกเลข + - ปริมาณ
- **Purchase**: ซื้อลอตเตอร์รี่
- **Results**: ดูผลรางวัล
- **Winning Check**: ตรวจรางวัล
- **AI Prediction**: ทำนายเลขด้วย Gemini
- **Admin**: ประกาศผล

## CSS Structure

### styles.css มี:

- Reset & Base styles
- Layout (Flexbox, Grid)
- Components (buttons, forms, cards)
- Responsive design (breakpoints: 1200px, 1400px)
- Animations & Transitions
- Custom scrollbar

## ฟีเจอร์พิเศษ

### Number Grid
- เลข 2 ตัว: Grid 10x10 (00-99)
- เลข 3 ตัว: Stepped selection

### UI/UX
- Gradient backgrounds
- Smooth animations
- Loading states
- Success/Error modals
- Responsive grid layout

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

Modern browsers with ES6+ support required.
