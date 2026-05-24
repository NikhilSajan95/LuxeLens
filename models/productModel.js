const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  stock_status: { type: String, enum: ['in_stock', 'out_of_stock'], default: 'in_stock' },
  description: { type: String },
  regular_price: { type: Number, required: true },
  offer_price: { type: Number },
  warranty: { type: Number },
  isDeleted: { type: Boolean, default: false },
  isListed: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  variants: [{
    color: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    images: { type: [String] }, // Images specific to each variant
    createdAt:{type:Date,default:Date.now},
    updatedAt:{type:Date,default:Date.now}
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);