const mongoose = require("mongoose");
const wishlistSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    items: [
      {
        product_id: {
          type: mongoose.Schema.ObjectId,
          ref: "product",
          required: true,
        },
        variant_id: { type: mongoose.Schema.Types.ObjectId, required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

const wishlist = mongoose.model("wishlist", wishlistSchema);

module.exports = wishlist;
