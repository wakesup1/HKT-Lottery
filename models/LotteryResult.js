const mongoose = require('mongoose');

const lotteryResultSchema = new mongoose.Schema({
  // Draw Information
  drawId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  drawLabel: {
    type: String,
    required: true
  },
  drawSequence: {
    type: Number,
    required: true
  },
  drawDate: {
    type: Date,
    required: true
  },
  
  // Lottery Results
  firstPrize: {
    type: String,
    required: true,
    length: 6
  },
  threeDigitFront: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 2 && arr.every(num => num.length === 3);
      },
      message: 'เลขหน้า 3 ตัวต้องมี 2 รางวัล'
    }
  },
  threeDigitBack: {
    type: [String],
    required: true,
    validate: {
      validator: function(arr) {
        return arr.length === 2 && arr.every(num => num.length === 3);
      },
      message: 'เลขท้าย 3 ตัวต้องมี 2 รางวัล'
    }
  },
  twoDigitBack: {
    type: String,
    required: true,
    length: 2
  },
  
  // Metadata
  lastUpdate: {
    type: Date,
    default: Date.now
  },
  story: String,
  inspiration: String,
  chaosLevel: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  algorithm: String,
  isLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
lotteryResultSchema.index({ drawDate: -1 });
lotteryResultSchema.index({ drawSequence: -1 });

// Static method to get latest result
lotteryResultSchema.statics.getLatest = function() {
  return this.findOne().sort({ drawSequence: -1 });
};

// Static method to get result by draw ID
lotteryResultSchema.statics.getByDrawId = function(drawId) {
  return this.findOne({ drawId });
};

module.exports = mongoose.model('LotteryResult', lotteryResultSchema);
