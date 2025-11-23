const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  expiresAt: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    required: true,
    min: 1
  },
  uses: {
    type: Number,
    default: 0,
    min: 0
  },
  minOrderValue: {
    type: Number,
    min: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: 0
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Unique index for non-deleted vouchers only
voucherSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null }
  }
);

module.exports = mongoose.model('Voucher', voucherSchema);
