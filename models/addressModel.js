const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    fullname: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    address:{type:String, required: true, trim :true},
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: Number, required: true },
    country: { type: String, required: true, trim: true },
    is_Default:{type:Boolean, default:false}
  },
  { timestamps: true }
);

const address = mongoose.model('address', addressSchema);

module.exports = address;