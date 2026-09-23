const asyncHandler   = require('express-async-handler')
const User           = require('../../models/userModel')
const Order          = require('../../models/orderModel')      
const Product        = require('../../models/productModel')   
const Coupon         = require('../../models/couponModel')
const messages       = require('../../constants/messages')
const httpStatus     = require('../../constants/httpStatus')

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_FLOW = [
  'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED',
  'CANCELLATION REQUESTED', 'CANCELLED',
  'RETURN REQUESTED', 'RETURNED',
]

function isBackwardStatus(current, next) {
  return STATUS_FLOW.indexOf(next) < STATUS_FLOW.indexOf(current)
}

// ─── List Orders ──────────────────────────────────────────────────────────────


const loadOrders = asyncHandler(async (req, res) => {
  const { search = '', paymentStatus = '', sort = 'newest', page = 1 } = req.query

  const filter = { showInOrders: false }

  if (search) {
    const users = await User.find({ email: { $regex: search, $options: 'i' } }).select('_id')
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },
      { user: { $in: users.map((u) => u._id) } },
    ]
  }

  if (paymentStatus) {
    filter.paymentStatus = paymentStatus.toUpperCase()
  }

  const sortOrder    = sort === 'oldest' ? 1 : -1
  const limit        = 5
  const currentPage  = parseInt(page) || 1
  const skip         = (currentPage - 1) * limit

  const totalOrder = await Order.countDocuments(filter)
  const totalPages = Math.ceil(totalOrder / limit)

  const orders = await Order.find(filter)
    .populate('user', 'email name')
    .sort({ createdAt: sortOrder })
    .skip(skip)
    .limit(limit)
    .lean()

  res.render('admin/order', {
    layout: 'layouts/adminLayout',
    orders,
    search,
    paymentStatus,
    sort,
    currentPage,
    totalPages,
    query: req.query,
  })
})

// ─── Order Detail ─────────────────────────────────────────────────────────────


const loadOrderDetails = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId)
    .populate('user', 'name email')
    .populate('items.product', 'title variants')   // variants hold color+size+images
    .populate('coupon', 'code name')
    .lean()

  if (!order) {
    return res.status(httpStatus.not_found).json({
      success: false, message: messages.ORDER.ORDER_NOT_FOUND,
    })
  }

  res.render('admin/orderDetail', {
    layout: 'layouts/adminLayout',
    order,
    STATUS_FLOW,   // pass flow so EJS can render allowed next statuses
  })
})

// ─── Update Item Status ───────────────────────────────────────────────────────


const updateItemStatus = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params
  const { status }          = req.body

  if (!STATUS_FLOW.includes(status)) {
    return res.status(httpStatus.bad_request).json({ success: false, message: 'Invalid status value.' })
  }

  const order = await Order.findById(orderId)
  if (!order) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.ORDER.ORDER_NOT_FOUND })
  }

  const item = order.items.id(itemId)
  if (!item) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.PRODUCT.PRODUCT_NOT_FOUND })
  }

  if (['CANCELLED', 'RETURNED'].includes(item.status)) {
    return res.status(httpStatus.bad_request).json({
      success: false, message: 'Cannot modify a cancelled or returned item.',
    })
  }

  if (isBackwardStatus(item.status, status)) {
    return res.status(httpStatus.bad_request).json({
      success: false,
      message: `Cannot move status from ${item.status} back to ${status}.`,
    })
  }

  // ── Stock restoration when cancelling ────────────────────────────────────
  if (status === 'CANCELLED') {
    try {
      const product = await Product.findById(item.product)
      if (product) {
        // Match variant by _id (variantId stored on order item)
        const variant = product.variants.id(item.variantId)
        if (variant) {
          variant.quantity += item.quantity   // schema field is `quantity` (stock)
          await product.save()
        }
      }
    } catch (err) {
      console.error('Stock restoration failed:', err)
    }

    item.previousStatus = item.status
    item.statusHistory  = item.statusHistory || []
    item.statusHistory.push({
      status:    'CANCELLED',
      timestamp: new Date(),
      note:      'Admin cancelled item — stock restored',
    })
  } else {
    item.statusHistory = item.statusHistory || []
    item.statusHistory.push({
      status,
      timestamp: new Date(),
      note:      `Admin updated status to ${status}`,
    })
  }

  item.status = status
  order.markModified('items')
  await order.save()

  res.json({ success: true, message: `Item status updated to ${status}.` })
})

// ─── Approve Cancellation ─────────────────────────────────────────────────────


const approveCancellation = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params

  const order = await Order.findById(orderId)
  if (!order) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.ORDER.ORDER_NOT_FOUND })
  }

  const item = order.items.id(itemId)
  if (!item) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.PRODUCT.PRODUCT_NOT_FOUND })
  }

  if (!item.cancellationRequest || item.cancellationRequest.status !== 'REQUESTED') {
    return res.status(httpStatus.bad_request).json({
      success: false, message: 'No pending cancellation request for this item.',
    })
  }

  // Restore variant stock
  try {
    const product = await Product.findById(item.product)
    if (product) {
      const variant = product.variants.id(item.variantId)
      if (variant) {
        variant.quantity += item.quantity
        await product.save()
      }
    }
  } catch (err) {
    console.error('Stock restoration failed on cancellation approval:', err)
  }

  item.previousStatus                    = item.status
  item.status                            = 'CANCELLED'
  item.cancellationRequest.status        = 'APPROVED'
  item.cancellationRequest.resolvedAt    = new Date()

  item.statusHistory = item.statusHistory || []
  item.statusHistory.push({
    status:    'CANCELLED',
    timestamp: new Date(),
    note:      'Admin approved cancellation — stock restored',
  })

  order.markModified('items')
  await order.save()

  res.json({ success: true, message: 'Cancellation approved.' })
})

// ─── Reject Cancellation ──────────────────────────────────────────────────────


const rejectCancellation = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params

  const order = await Order.findById(orderId)
  if (!order) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.ORDER.ORDER_NOT_FOUND })
  }

  const item = order.items.id(itemId)
  if (!item) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.PRODUCT.PRODUCT_NOT_FOUND })
  }

  item.cancellationRequest.status = 'REJECTED'

  if (item.status === 'CANCELLATION REQUESTED') {
    item.status         = item.previousStatus || 'PROCESSING'
    item.previousStatus = null
  }

  item.statusHistory = item.statusHistory || []
  item.statusHistory.push({
    status:    item.status,
    timestamp: new Date(),
    note:      'Admin rejected cancellation request',
  })

  order.markModified('items')
  await order.save()

  res.json({ success: true, message: 'Cancellation rejected.' })
})

// ─── Approve Return ───────────────────────────────────────────────────────────


const approveReturn = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params

  const order = await Order.findById(orderId)
  if (!order) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.ORDER.ORDER_NOT_FOUND })
  }

  const item = order.items.id(itemId)
  if (!item) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.PRODUCT.PRODUCT_NOT_FOUND })
  }

  if (!item.returnRequest || item.returnRequest.status !== 'REQUESTED') {
    return res.status(httpStatus.bad_request).json({
      success: false, message: 'No pending return request for this item.',
    })
  }

  // Restore variant stock
  try {
    const product = await Product.findById(item.product)
    if (product) {
      const variant = product.variants.id(item.variantId)
      if (variant) {
        variant.quantity += item.quantity
        await product.save()
      }
    }
  } catch (err) {
    console.error('Stock restoration failed on return approval:', err)
  }

  item.returnRequest.status     = 'COMPLETED'
  item.returnRequest.resolvedAt = new Date()
  item.previousStatus           = item.status
  item.status                   = 'RETURNED'

  item.statusHistory = item.statusHistory || []
  item.statusHistory.push({
    status:    'RETURNED',
    timestamp: new Date(),
    note:      'Admin approved return — stock restored',
  })

  order.markModified('items')
  await order.save()

  res.json({ success: true, message: 'Return approved.' })
})

// ─── Reject Return ────────────────────────────────────────────────────────────


const rejectReturn = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params

  const order = await Order.findById(orderId)
  if (!order) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.ORDER.ORDER_NOT_FOUND })
  }

  const item = order.items.id(itemId)
  if (!item) {
    return res.status(httpStatus.not_found).json({ success: false, message: messages.PRODUCT.PRODUCT_NOT_FOUND })
  }

  item.returnRequest.status = 'REJECTED'
  item.status               = 'DELIVERED'

  item.statusHistory = item.statusHistory || []
  item.statusHistory.push({
    status:    'DELIVERED',
    timestamp: new Date(),
    note:      'Admin rejected return request',
  })

  order.markModified('items')
  await order.save()

  res.json({ success: true, message: 'Return rejected.' })
})

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  loadOrders,
  loadOrderDetails,
  updateItemStatus,
  approveCancellation,
  rejectCancellation,
  approveReturn,
  rejectReturn,
}