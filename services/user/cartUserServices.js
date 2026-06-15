const Product  = require('../../models/productModel')
const Cart     = require('../../models/cartModel')
const Wishlist = require('../../models/wishlistModel')
const Category = require('../../models/categoryModel')
const Brand    = require('../../models/brandModel')
const messages = require('../../constants/messages')


function findVariant(product, variantId) {
    if (!product?.variants?.length) return null
    return product.variants.find(
        (v) => v._id?.toString() === variantId?.toString()
    ) || null
}

function calculateSummary(cart) {
    let subtotal = 0
    for (const item of cart.items) {
        subtotal += Number(item.price) * item.quantity
    }
    const tax   = Math.round(subtotal * 0.02 * 100) / 100
    const total = subtotal + tax
    return { subtotal, tax, total }
}

function cartCount(cart) {
    return cart.items.reduce((sum, i) => sum + i.quantity, 0)
}

function displayCartLength(count) {
    return count > 5 ? '5+' : String(count)
}



async function fetchProductWithVariant(productId, variantId) {
    return Product.findOne(
        {
            _id:       productId,
            isDeleted: false,
            isListed:  true,
            variants:  { $elemMatch: { _id: variantId } },
        },
        {
            title:         1,
            regular_price: 1,
            offer_price:   1,
            category_id:   1,
            brand_id:      1,
            isListed:      1,
            isDeleted:     1,
            'variants.$':  1,
        }
    )
}


async function addToCartService({ productId, variantId, qty, userId }) {
    const product = await fetchProductWithVariant(productId, variantId)
    if (!product) {
        return { success: false, status: 404, message: messages.PRODUCT.PRODUCT_NOT_FOUND }
    }

    const [category, brand] = await Promise.all([
        Category.findById(product.category_id, 'isListed isDeleted').lean(),
        Brand.findById(product.brand_id, 'isActive isDeleted').lean(),
    ])

    if (!category || category.isDeleted || !category.isListed) {
        return { success: false, status: 400, message: messages.CATEGORY.CATEGORY_BLOCKED }
    }
    if (!brand || brand.isDeleted || !brand.isActive) {
        return { success: false, status: 400, message: messages.BRAND.BRAND_BLOCKED }
    }

    // $elemMatch returns the matched variant at [0]
    const variant = product.variants[0]
    if (!variant) {
        return { success: false, status: 404, message: messages.VARIANT.VARIANT_NOT_FOUND }
    }
    if (variant.quantity <= 0 || variant.quantity < qty) {
        return { success: false, status: 400, message: messages.STOCK.OUT_OF_STOCK }
    }

    let cart = await Cart.findOne({ user_id: userId })
    if (!cart) cart = new Cart({ user_id: userId, items: [] })

    const existingItem = cart.items.find(
        (item) =>
            item.product_id?.toString() === productId.toString() &&
            item.variant_id?.toString() === variantId.toString()
    )

    if (existingItem) {
        if (existingItem.quantity >= 5) {
            return { success: false, status: 400, message: messages.STOCK.STOCK_ALLOWED }
        }
        if (existingItem.quantity + qty > 5) {
            return { success: false, status: 400, message: messages.STOCK.STOCK_ALLOWED }
        }
        if (existingItem.quantity + qty > variant.quantity) {
            return { success: false, status: 400, message: messages.STOCK.OUT_OF_STOCK }
        }
        existingItem.quantity += qty
    } else {
        if (qty > 5) {
            return { success: false, status: 400, message: messages.STOCK.STOCK_ALLOWED }
        }
        const price = Number(product.offer_price ?? product.regular_price)
        cart.items.push({
            product_id: product._id,
            variant_id: variant._id,
            size:       variant.size,
            color:      variant.color,
            quantity:   qty,
            price,
        })
    }

    await cart.save()

    const count = cartCount(cart)
    return {
        success:           true,
        status:            200,
        message:           messages.CART.CART_ADD,
        cartLength:        count,
        displayCartLength: displayCartLength(count),
    }
}


async function loadCartService(userId, query) {
    const cart = await Cart.findOne({ user_id: userId })

    if (!cart || cart.items.length === 0) {
        return {
            empty:             true,
            cartItems:         [],
            subtotal:          0,
            tax:               0,
            total:             0,
            cartLength:        0,
            displayCartLength: '0',
            error:             query.error || null,
        }
    }

    // Fetch all products in ONE $in query
    const productIds = [...new Set(cart.items.map((i) => i.product_id.toString()))]
    const products   = await Product.find(
        { _id: { $in: productIds } },
        { title: 1, regular_price: 1, offer_price: 1, category_id: 1, brand_id: 1, isListed: 1, isDeleted: 1, variants: 1 }
    ).lean()

    const productMap  = Object.fromEntries(products.map((p) => [p._id.toString(), p]))

    // Collect unique category + brand IDs, fetch in parallel
    const categoryIds = [...new Set(products.map((p) => p.category_id?.toString()).filter(Boolean))]
    const brandIds    = [...new Set(products.map((p) => p.brand_id?.toString()).filter(Boolean))]

    const [categories, brands] = await Promise.all([
        Category.find({ _id: { $in: categoryIds } }, { isListed: 1, isDeleted: 1 }).lean(),
        Brand.find({ _id: { $in: brandIds } }, { isActive: 1, isDeleted: 1 }).lean(),
    ])

    const categoryMap = Object.fromEntries(categories.map((c) => [c._id.toString(), c]))
    const brandMap    = Object.fromEntries(brands.map((b) => [b._id.toString(), b]))

    const cartItems = []
    let subtotal = 0, modified = false, stockAdjusted = false

    for (const item of cart.items) {
        const product  = productMap[item.product_id.toString()]
        const category = product ? categoryMap[product.category_id?.toString()] : null
        const brand    = product ? brandMap[product.brand_id?.toString()] : null
        const variant  = product ? findVariant(product, item.variant_id) : null

        // Remove if product/category/brand invalid or variant missing
        if (
            !product || product.isDeleted || !product.isListed ||
            !category || category.isDeleted || !category.isListed ||
            !brand || brand.isDeleted || !brand.isActive ||
            !variant
        ) {
            cart.items.pull(item._id)
            modified = true
            continue
        }

        const availableStock = variant.quantity ?? 0

        if (availableStock <= 0) {
            cartItems.push({ _id: item._id, product, variant, quantity: item.quantity, subtotal: 0, outOfStock: true })
            continue
        }

        if (item.quantity > availableStock) {
            item.quantity = availableStock
            modified      = true
            stockAdjusted = true
        }

        const finalPrice   = Number(item.price)
        const itemSubtotal = finalPrice * item.quantity
        subtotal          += itemSubtotal

        cartItems.push({
            _id:        item._id,
            product,
            variant,
            quantity:   item.quantity,
            price:      finalPrice,
            subtotal:   itemSubtotal,
            outOfStock: false,
        })
    }

    if (modified) await cart.save()

    const tax           = Math.round(subtotal * 0.02 * 100) / 100
    const total         = subtotal + tax
    const count         = cartCount(cart)
    const hasOutOfStock = cartItems.some((i) => i.outOfStock)

    return {
        empty: false,
        cartItems,
        subtotal,
        tax,
        total,
        cartLength:        count,
        displayCartLength: displayCartLength(count),
        hasOutOfStock,
        error:             stockAdjusted ? 'stockUpdate' : query.error || null,
        products:          query.products || null,
    }
}


async function increaseQtyService({ userId, itemId }) {
    const cart = await Cart.findOne({ user_id: userId })
    if (!cart) return { success: false, status: 404, message: messages.CART.CART_NOT_FOUND }

    const item = cart.items.id(itemId)
    if (!item) return { success: false, status: 404, message: messages.PRODUCT.PRODUCT_NOT_FOUND }

    const product = await fetchProductWithVariant(item.product_id, item.variant_id)
    if (!product) return { success: false, status: 404, message: messages.PRODUCT.PRODUCT_NOT_FOUND }

    const variant        = product.variants[0]
    if (!variant) return { success: false, status: 404, message: messages.VARIANT.VARIANT_NOT_FOUND }

    const availableStock = variant.quantity ?? 0

    // Clamp if cart qty already exceeds current stock
    if (item.quantity > availableStock) {
        item.quantity = availableStock
        await cart.save()
        const summary = calculateSummary(cart)
        const count   = cartCount(cart)
        return {
            success: false, status: 200,
            newQty: item.quantity, summary,
            cartLength: count, displayCartLength: displayCartLength(count),
            message: `Stock reduced to ${availableStock}`,
        }
    }

    if (item.quantity >= availableStock) {
        return { success: false, status: 400, message: messages.STOCK.OUT_OF_STOCK }
    }
    if (item.quantity >= 5) {
        return { success: false, status: 400, message: messages.STOCK.STOCK_ALLOWED }
    }

    item.quantity += 1
    await cart.save()

    const summary = calculateSummary(cart)
    const count   = cartCount(cart)
    return {
        success: true, status: 200,
        newQty: item.quantity, summary,
        cartLength: count, displayCartLength: displayCartLength(count),
    }
}


async function decreaseQtyService({ userId, itemId }) {
    const cart = await Cart.findOne({ user_id: userId })
    if (!cart) return { success: false, status: 404, message: messages.CART.CART_NOT_FOUND }

    const item = cart.items.id(itemId)
    if (!item) return { success: false, status: 404, message: messages.PRODUCT.PRODUCT_NOT_FOUND }

    const product = await fetchProductWithVariant(item.product_id, item.variant_id)
    if (!product) return { success: false, status: 404, message: messages.PRODUCT.PRODUCT_NOT_FOUND }

    const variant        = product.variants[0]
    if (!variant) return { success: false, status: 404, message: messages.VARIANT.VARIANT_NOT_FOUND }

    const availableStock = variant.quantity ?? 0

    if (item.quantity > availableStock) {
        item.quantity = availableStock
        await cart.save()
        const summary = calculateSummary(cart)
        const count   = cartCount(cart)
        return {
            success: true, status: 200,
            newQty: item.quantity, summary,
            cartLength: count, displayCartLength: displayCartLength(count),
            message: `Stock reduced to ${availableStock}`,
        }
    }

    if (item.quantity <= 1) {
        return { success: false, status: 400, message: messages.CART.CART_MIN_QTY }
    }

    item.quantity -= 1
    await cart.save()

    const summary = calculateSummary(cart)
    const count   = cartCount(cart)
    return {
        success: true, status: 200,
        newQty: item.quantity, removed: false, summary,
        cartLength: count, displayCartLength: displayCartLength(count),
    }
}


async function removeItemService({ userId, itemId }) {
    const cart = await Cart.findOne({ user_id: userId })
    if (!cart) return { success: false, status: 404, message: messages.CART.CART_NOT_FOUND }

    const item = cart.items.id(itemId)
    if (!item) return { success: false, status: 404, message: messages.PRODUCT.PRODUCT_NOT_FOUND }

    cart.items.pull(itemId)
    await cart.save()

    const summary = calculateSummary(cart)
    const count   = cartCount(cart)
    return {
        success: true, status: 200,
        removed: true, summary,
        cartLength: count, displayCartLength: displayCartLength(count),
    }
}

module.exports = {
    addToCartService,
    loadCartService,
    increaseQtyService,
    decreaseQtyService,
    removeItemService,
}