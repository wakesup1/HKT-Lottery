require('dotenv').config();
const connectDB = require('./config/database');
const Draw = require('./models/Draw');
const LotteryResult = require('./models/LotteryResult');
const Purchase = require('./models/Purchase');

// Initial draw setup
const initializeDraws = async () => {
  try {
    await connectDB();
    
    console.log('🔄 กำลัง Migration ข้อมูลเริ่มต้น...\n');
    
    // Clear existing data (ระวัง! ใช้เฉพาะครั้งแรก)
    await Draw.deleteMany({});
    await LotteryResult.deleteMany({});
    await Purchase.deleteMany({});
    
    console.log('✅ ล้างข้อมูลเดิมเรียบร้อย');
    
    // Create initial draw
    const now = new Date();
    const drawDate = new Date(now);
    drawDate.setDate(drawDate.getDate() + 15);
    
    const initialDraw = new Draw({
      id: `draw-${Date.now()}`,
      label: `งวดประจำวันที่ ${drawDate.getDate()} ${drawDate.toLocaleDateString('th-TH', { month: 'long' })} ${drawDate.getFullYear() + 543}`,
      sequence: 1,
      date: drawDate,
      isActive: true
    });
    
    await initialDraw.save();
    console.log(`✅ สร้างงวดเริ่มต้น: ${initialDraw.label}`);
    
    console.log('\n✨ Migration เสร็จสมบูรณ์!\n');
    console.log('📊 สถิติ:');
    console.log(`   - Draws: ${await Draw.countDocuments()}`);
    console.log(`   - Results: ${await LotteryResult.countDocuments()}`);
    console.log(`   - Purchases: ${await Purchase.countDocuments()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration ล้มเหลว:', error);
    process.exit(1);
  }
};

initializeDraws();
