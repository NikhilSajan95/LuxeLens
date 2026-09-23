const asyncHandler = require('express-async-handler')
const Address      = require('../../models/addressModel')
const Cart         = require('../../models/cartModel')
const Order        = require('../../models/orderModel')
const Product      = require('../../models/productModel')



async function fetchProductWithVariant(productId, variantId) {
    return Product.findOne(
        {
            _id:      productId,
            isDeleted: false,
            isListed:  true,
            variants:  { $elemMatch: { _id: variantId } },
        },
        {
            title:         1,
            regular_price: 1,
            offer_price:   1,
            isListed:      1,
            isDeleted:     1,
            'variants.$':  1,   // only the matched variant
        }
    ).lean()
}


async function isStockSufficient(productId, variantId, requiredQty) {
    return Product.exists({
        _id:      productId,
        isDeleted: false,
        isListed:  true,
        variants:  { $elemMatch: { _id: variantId, quantity: { $gte: requiredQty } } },
    })
}



const loadCheckout = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    if (!userId) return res.redirect('/auth/login')

    const [addresses, cart] = await Promise.all([
        Address.find({ user_id: userId }).lean(),
        Cart.findOne({ user_id: userId })
            .populate('items.product_id', 'title regular_price offer_price variants isListed isDeleted')
            .lean(),
    ])

    if (!cart || cart.items.length === 0) {
        return res.redirect('/cart')
    }

    let removedItems = false
    const validItems = []

    for (const item of cart.items) {
        const product = item.product_id
        if (!product || product.isDeleted || !product.isListed) {
            removedItems = true
            continue
        }

        const sufficient = await isStockSufficient(
            product._id,
            item.variant_id,
            item.quantity
        )

        if (!sufficient) {
            removedItems = true
            continue
        }

        validItems.push(item)
    }

    if (removedItems) {
        await Cart.updateOne({ _id: cart._id }, { $set: { items: validItems } })
        return res.redirect('/cart?error=stock')
    }

    // ── Totals — simple arithmetic on data already in memory ─────────────
    let subtotal = 0
    for (const item of validItems) {
        subtotal += Number(item.price) * item.quantity
    }

    const taxAmount = Math.round(subtotal * 0.02 * 100) / 100
    const total     = subtotal + taxAmount

    res.render('user/checkout', {
        layout:     'layouts/user_main',
        addresses,
        cart:       { ...cart, items: validItems },
        subtotal:   subtotal.toFixed(2),
        taxAmount:  taxAmount.toFixed(2),
        total:      total.toFixed(2),
        cartLength: validItems.length,
        selectedId: req.query.selected || null,
        error:      req.query.error || null,
        success:    req.query.success || null,
    })
})


const placeOrder = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    if (!userId) return res.redirect('/auth/login')

    const { addressId, paymentMethod } = req.body

    if (paymentMethod !== 'COD') {
        return res.redirect('/checkout?error=invalidPayment')
    }

    const [selectedAddress, cart] = await Promise.all([
        Address.findOne({ _id: addressId, user_id: userId }).lean(),  // fetch only the chosen address
        Cart.findOne({ user_id: userId })
            .populate('items.product_id', 'title regular_price offer_price variants isListed isDeleted')
            .lean(),
    ])

    if (!selectedAddress) return res.redirect('/checkout?error=noAddress')

    if (!cart || cart.items.length === 0) return res.redirect('/cart')

   
    const productIds = cart.items.map((i) => i.product_id._id ?? i.product_id)
    const products   = await Product.find(
        { _id: { $in: productIds }, isDeleted: false, isListed: true },
        { title: 1, regular_price: 1, offer_price: 1, isListed: 1, isDeleted: 1, variants: 1 }
    ).lean()

    const productMap = Object.fromEntries(
        products.map((p) => [p._id.toString(), p])
    )

    //  Stock re-validation 
    let stockIssue            = false
    const updatedItems        = []
    const stockAdjustedProducts = []

    for (const item of cart.items) {
        const productId = (item.product_id._id ?? item.product_id).toString()
        const product   = productMap[productId]

        if (!product) {
            stockIssue = true
            continue
        }

        const variant = product.variants?.find(
            (v) => v._id?.toString() === item.variant_id?.toString()
        )

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

    //  arithmetic calculations
    let subtotal = 0
    for (const item of updatedItems) {
        subtotal += Number(item.price) * item.quantity
    }

    const taxAmount   = Math.round(subtotal * 0.02 * 100) / 100
    const totalAmount = subtotal + taxAmount

    //  Build order items — transformation in JS
    const orderItems = updatedItems.map((it) => {
        const productId  = (it.product_id._id ?? it.product_id).toString()
        const product    = productMap[productId]
        const actualPrice = Math.round(Number(product.regular_price ?? it.price) * 100) / 100
        const savedPrice  = Math.round(Number(it.price) * 100) / 100
        const qty         = it.quantity
        const totalPrice  = Math.round(savedPrice * qty * 100) / 100
        const itemTax     = Math.round(savedPrice * 0.02 * 100) / 100
        const itemDiscount = Math.round((actualPrice - savedPrice) * 100) / 100

        const matchedVariant = product.variants?.find(
            (v) => v._id?.toString() === it.variant_id?.toString()
        ) ?? null

        return {
            product:        product._id,
            variantId:      it.variant_id,
            title:          product.title,
            color:          it.color,
            size:           it.size,
            image:          matchedVariant?.images?.[0] ?? null,
            actualPrice,
            offerPrice:     savedPrice,
            price:          savedPrice,
            couponDiscount: 0,
            taxBase:        savedPrice,
            tax:            itemTax,
            discount:       itemDiscount,
            offerApplied:   itemDiscount,
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
        paymentMethod:     'COD',
        paymentStatus:     'PENDING',
        subtotal,
        taxAmount,
        couponDiscount:    0,
        discount:          0,
        totalAmount,
        totalOfferApplied: 0,
        offerDiscount:     0,
        actualTotal:       subtotal,
        coupon:            null,
    })

    await newOrder.save()

    // ── Deduct stock 
    await Product.bulkWrite(
        updatedItems.map((item) => ({
            updateOne: {
                filter: {
                    _id:          item.product_id._id ?? item.product_id,
                    'variants._id': item.variant_id,
                },
                update: { $inc: { 'variants.$.quantity': -item.quantity } },
            },
        }))
    )

    // ── Clear cart 
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