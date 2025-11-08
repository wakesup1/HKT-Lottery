const mongoose = require('mongoose');

const drawSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  label: {
    type: String,
    required: true
  },
  sequence: {
    type: Number,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
drawSchema.index({ sequence: -1 });
drawSchema.index({ isActive: 1 });

// Static method to get active draw
drawSchema.statics.getActiveDraw = function() {
  return this.findOne({ isActive: true }).sort({ sequence: -1 });
};

module.exports = mongoose.model('Draw', drawSchema);
