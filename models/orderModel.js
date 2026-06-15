const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'product',
          required: true,
        },
        variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
        title:          String,
        color:        String,   
        size:           String,
        image:          String,
        actualPrice:    Number,   
        offerPrice:     Number,   
        price:          Number,   // final unit price paid
        couponDiscount: Number,   // per-item coupon share
        taxBase:        Number,   // base used for tax calculation
        tax:            Number,
        discount:       Number,
        offerApplied:   Number,
        quantity:       Number,
        totalPrice:     Number,
        status: {
          type: String,
          enum: [
            'PROCESSING',
            'PACKED',
            'SHIPPED',
            'DELIVERED',
            'RETURN REQUESTED',
            'CANCELLED',
            'RETURNED',
          ],
          default: 'PROCESSING',
        },
        paymentStatus: {
          type: String,
          enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
          default: 'PENDING',
        },
        statusHistory: [
          {
            status: String,
            timestamp: { type: Date, default: Date.now },
            note: String,
          },
        ],
        expectedDelivery: {
          type: Date,
          default: () => {
            const date = new Date();
            date.setDate(date.getDate() + 7);
            return date;
          },
        },
        returnRequest: {
          status: {
            type: String,
            enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'],
            default: 'NONE',
          },
          reason: String,
          requestedAt: Date,
          resolvedAt: Date,
          refundAmount: Number,
        },
        
        cancellationRequest: {
          status: {
            type: String,
            enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED'],
            default: 'NONE',
          },
          reason: String,
          requestedAt: Date,
          resolvedAt: Date,
          refundAmount: Number,
        },
        previousStatus: { type: String },
      },
    ],
    orderAddress: {
      name: String,           
      street_address: String, 
      district: String,
      state: String,
      pincode: String,
      country: String,
      mobile: String,
    },
    paymentMethod: {
      type: String,
      enum: ['COD', 'CARD', 'WALLET', 'BANK'],
      default: 'COD',
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PARTIALLY_COMPLETED', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    paymentDetails: {
      transactionId: String,
      paidAt: Date,
    },
    subtotal: Number,
    taxAmount: Number,   
    shippingCost: { type: Number, default: 0 },
    discount: Number,    
    totalAmount: Number,
    couponDiscount: { type: Number, default: 0 },
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null,
    },
    totalOfferApplied: { type: Number, default: 0 },
    orderNumber: { type: String, unique: true },

    
    offerDiscount:  { type: Number, default: 0 },  // offer savings across all items
    actualTotal:    { type: Number, default: 0 },  // pre-offer grand total
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate order number 
OrderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timePart   = Date.now().toString().slice(-4);
    this.orderNumber = `NUT-${randomPart}${timePart}`;
  }
  next();
});

// Auto-update paymentStatus based on item statuses
OrderSchema.pre('save', function (next) {
  if (this.items.length === 0) return next();

  const allStatus = this.items.map((item) => item.status);

  if (this.paymentStatus === 'FAILED') return next();

  const isAllReturned = allStatus.every((s) => s === 'RETURNED');
  if (isAllReturned) {
    this.paymentStatus = 'REFUNDED';
    return next();
  }

  if (!['CARD', 'WALLET'].includes(this.paymentMethod)) {
    const isAllCancelled = allStatus.every((s) => s === 'CANCELLED');
    if (isAllCancelled) {
      this.paymentStatus = 'FAILED';
      return next();
    }
  }

  const isAllDelivered = allStatus.every((s) => s === 'DELIVERED');
  if (this.paymentMethod === 'COD' && isAllDelivered) {
    this.paymentStatus = 'COMPLETED';
    return next();
  }

  if (
    this.paymentMethod === 'COD' &&
    allStatus.some((s) =>
      ['PROCESSING', 'PACKED', 'SHIPPED', 'RETURN REQUESTED', 'CANCELLATION REQUESTED'].includes(s)
    )
  ) {
    this.paymentStatus = 'PENDING';
    return next();
  }

  next();
});

module.exports = mongoose.model('Order', OrderSchema);