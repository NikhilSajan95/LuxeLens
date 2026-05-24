const asyncHandler = require('express-async-handler')
const messages     = require('../../constants/messages')
const Address      = require('../../models/addressModel')
const Cart         = require('../../models/cartModel')
const Order        = require('../../models/orderModel')
const Product      = require('../../models/productModel')



function getVariant(product, variantId) {
    if (typeof product.variants?.id === 'function') {
        return product.variants.id(variantId)
    }
    return product.variants?.find(
        (v) => v._id?.toString() === variantId?.toString()
    ) ?? null
}



const loadCheckout = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    if (!userId) return res.redirect('/auth/login')

    const addresses = await Address.find({ user_id: userId }).lean()
    const cart = await Cart.findOne({ user_id: userId })
        .populate('items.product_id')
        .lean()

    if (!cart || cart.items.length === 0) {
        return res.redirect('/cart')
    }

    //   Stock validation 
    let removedItems = false
    const validItems = []

    for (const item of cart.items) {
        const product = item.product_id
        if (!product || product.isDeleted || !product.isListed) {
            removedItems = true
            continue
        }

        const variant = getVariant(product, item.variant_id)
        if (!variant || variant.quantity < item.quantity) {
            removedItems = true
            continue
        }

        validItems.push(item)
    }

    if (removedItems) {
        await Cart.updateOne({ _id: cart._id }, { $set: { items: validItems } })
        return res.redirect('/cart?error=stock')
    }

  
    
    let subtotal = 0
    for (const item of validItems) {
        subtotal += Number(item.price) * item.quantity
    }

    const taxAmount = Number((subtotal * 0.02).toFixed(2))
    const total     = subtotal + taxAmount

    res.render('user/checkout', {
        layout:    'layouts/user_main',
        addresses,
        cart:      { ...cart, items: validItems },
        subtotal:  subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        total:     total.toFixed(2),
        cartLength: validItems.length,
        selectedId: req.query.selected || null,
        error:      req.query.error || null,
        success:    req.query.success || null,
    })
})


const placeOrder = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    if (!userId) return res.redirect('/auth/login')

    const { addressIndex, paymentMethod } = req.body

    
    if (paymentMethod !== 'COD') {
        return res.redirect('/checkout?error=invalidPayment')
    }

    const addresses = await Address.find({ user_id: userId }).lean()
    const selectedAddress = addresses[addressIndex]
    if (!selectedAddress) return res.redirect('/checkout?error=noAddress')

    const cart = await Cart.findOne({ user_id: userId })
        .populate('items.product_id')
        .lean()

    if (!cart || cart.items.length === 0) return res.redirect('/cart')

    let stockIssue            = false
    let updatedItems          = []
    let stockAdjustedProducts = []

    for (const item of cart.items) {
        const product = await Product.findById(item.product_id._id ?? item.product_id)
        if (!product || product.isDeleted || !product.isListed) {
            stockIssue = true
            continue
        }

        const variant = getVariant(product, item.variant_id)
        if (!variant) {
            stockIssue = true
            continue
        }

        if (variant.quantity === 0) {
            stockIssue = true
            continue
        }

        if (variant.quantity < item.quantity) {
            stockIssue = true
            stockAdjustedProducts.push({
                name:      product.title,
                available: variant.quantity,
            })
            updatedItems.push({ ...item, quantity: variant.quantity })
        } else {
            updatedItems.push(item)
        }
    }

    await Cart.updateOne({ _id: cart._id }, { $set: { items: updatedItems } })

    if (updatedItems.length === 0) return res.redirect('/cart?error=stock')

    if (stockIssue) {
        const productList = stockAdjustedProducts
            .map((p) => `${p.name} (only ${p.available} left)`)
            .join(', ')
        return res.redirect(
            `/cart?error=stockUpdate&products=${encodeURIComponent(productList)}`
        )
    }

    let subtotal = 0
    for (const item of updatedItems) {
        subtotal += Number(item.price) * item.quantity
    }

    const taxAmount   = Number((subtotal * 0.02).toFixed(2))
    const totalAmount = subtotal + taxAmount

    const orderItems = updatedItems.map((it) => {
        const product_doc = it.product_id
        const savedPrice  = Number(it.price)
        const qty         = it.quantity
        const totalPrice  = savedPrice * qty
        const itemTax     = Number((savedPrice * 0.02).toFixed(2))

        const matchedVariant = product_doc.variants?.find(
            (v) => v._id?.toString() === it.variant_id?.toString()
        ) ?? null

        return {
            product:        product_doc._id ?? it.product_id,
            title:          product_doc.title ?? it.title,
            flavour:        it.flavour,
            size:           it.size,
            image:          matchedVariant?.images?.[0] ?? null,
            price:          savedPrice,
            tax:            itemTax,
            quantity:       qty,
            totalPrice,
            status:         'PROCESSING',
            paymentStatus:  'PENDING',
            previousStatus: null,
            cancellationRequest: { status: 'NONE' },
            statusHistory:  [{ status: 'PROCESSING', note: 'Order Created' }],
        }
    })

    //  Save order 
    const newOrder = new Order({
        user: userId,
        items: orderItems,
        orderAddress: {
            name:           selectedAddress.fullname ?? selectedAddress.name,
            street_address: selectedAddress.address  ?? selectedAddress.street_address,
            district:       selectedAddress.district,
            state:          selectedAddress.state,
            country:        selectedAddress.country,
            pincode:        selectedAddress.pincode,
            mobile:         selectedAddress.mobile,
        },
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        subtotal,
        taxAmount,
        totalAmount,
    })

    await newOrder.save()

    //  Deduct stock
    for (const item of updatedItems) {
        await Product.updateOne(
            { 'variants._id': item.variant_id },
            { $inc: { 'variants.$.quantity': -item.quantity } }
        )
    }

    //  Clear cart 
    await Cart.updateOne({ _id: cart._id }, { $set: { items: [] } })

    return res.redirect(`/checkout/${newOrder._id}/success`)
})


const viewOrderSuccess = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    if (!userId) return res.redirect('/auth/login')

    const order = await Order.findById(req.params.id)
        .populate('user', 'email')
        .lean()

    if (!order) return res.redirect('/')

    res.render('user/orderSuccess', {
        layout: 'layouts/user_main',
        order,
    })
})

module.exports = { loadCheckout, placeOrder, viewOrderSuccess }