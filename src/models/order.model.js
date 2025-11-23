const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    category: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    qty: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  subTotal: {
    type: Number,
    required: true,
    min: 0
  },
  applied: {
    code: String,
    discountType: {
      type: String,
      enum: ['promotion', 'voucher']
    },
    discountAmount: {
      type: Number,
      default: 0
    }
  },
  finalTotal: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
