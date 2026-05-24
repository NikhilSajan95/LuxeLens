const mongoose = require("mongoose");
const cartSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
    },
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variant_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        quantity: { type: Number, required: true, min: 1, default: 1 },
        size: { type: String, required: true, trim: true },
        color: { type: String, required: true, trim: true },
        price: { type: Number, required: true, min: 0 },
      },
    ],
  },
  { timestamps: true },
);

const cart = mongoose.model("cart", cartSchema);

module.exports = cart;
