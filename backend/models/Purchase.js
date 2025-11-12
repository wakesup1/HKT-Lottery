const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  // Draw Information
  drawId: {
    type: String,
    required: true,
    index: true
  },
  drawLabel: String,
  drawSequence: Number,
  drawDate: Date,
  
  // Customer Information
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Lottery Entries
  entries: [{
    id: Number,
    numberType: {
      type: String,
      enum: ['twoDigitBack', 'threeDigitFront', 'threeDigitBack'],
      required: true
    },
    number: {
      type: String,
      required: true
    },
    label: String,
    prizeLabel: String,
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    price: Number,
    totalPrice: Number,
    status: {
      type: String,
      enum: ['pending', 'win', 'lose'],
      default: 'pending'
    }
  }],
  
  // Purchase Details
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'win', 'lose'],
    default: 'pending'
  },
  lastCheckedAt: Date,
  checkedDrawId: String
}, {
  timestamps: true
});

// Indexes for performance
purchaseSchema.index({ drawId: 1, customerName: 1 });
purchaseSchema.index({ purchaseDate: -1 });
purchaseSchema.index({ status: 1 });

// Virtual for formatted purchase date
purchaseSchema.virtual('formattedDate').get(function() {
  return this.purchaseDate.toLocaleString('th-TH');
});

module.exports = mongoose.model('Purchase', purchaseSchema);
