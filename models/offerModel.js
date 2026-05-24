const mongoose = require('mongoose')

const offerSchema = new mongoose.Schema({
  offerName: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  discountPercentage: {
    type: Number,
    required: true,
    min: 1,
    max: 90, 
  },
  product: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'product',
    },
  ],
  category: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'category',
    },
  ],
  brand: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'brand', 
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  validFrom: {
    type: Date,
    required: true,
  },
  validTo: {
    type: Date,
    required: true,
  },
},{timestamps:true});

offerSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validTo
  );
};


module.exports = mongoose.model('offer',offerSchema)