const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  discountAmount: { type: Number, required: true, min: 0 },
  minimumPurchase: { type: Number, default: 0, min: 0 },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  usageLimit: { type: Number, default: null },
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  usedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true })

couponSchema.pre('save', function(next) {
  if (this.endDate < new Date()) {
    this.isActive = false;
  }
  next();
});

module.exports = mongoose.model('Coupon', couponSchema)