const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Remove deprecated options
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lottery');
    
    console.log(`MongoDB เชื่อมต่อสำเร็จ: ${conn.connection.host}`);
    
    // Event listeners
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
  } catch (error) {
    console.error('MongoDB เชื่อมต่อล้มเหลว:', error.message);
    console.error('\n แนะนำ:');
    console.error('  1. ติดตั้ง MongoDB: brew install mongodb-community');
    console.error('  2. เริ่มต้น MongoDB: brew services start mongodb-community');
    console.error('  3. หรือใช้ MongoDB Atlas (Cloud): https://www.mongodb.com/cloud/atlas\n');
    process.exit(1);
  }
};

module.exports = connectDB;
