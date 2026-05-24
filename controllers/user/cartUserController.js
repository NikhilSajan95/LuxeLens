const asyncHandler = require('express-async-handler')
const mongoose = require('mongoose')

const Product = require('../../models/productModel')
const Cart = require('../../models/cartModel')
const Wishlist = require('../../models/wishlistModel')
const Category = require('../../models/categoryModel')
const Brand = require('../../models/brandModel')

const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function findVariant(product, variantId) {
    if (!product?.variants?.length) {
        return null
    }

    return (
        product.variants.find(
            (variant) =>
                variant._id?.toString() ===
                variantId?.toString()
        ) || null
    )
}

function cartCount(cart) {
    if (!cart?.items?.length) {
        return 0
    }

    return cart.items.reduce(
        (total, item) => total + item.quantity,
        0
    )
}

function displayCartLength(count) {
    return count > 5 ? '5+' : String(count)
}

// ─────────────────────────────────────────────────────────────
// CART SUMMARY
// ─────────────────────────────────────────────────────────────

async function calculateSummary(userId) {
    const summary = await Cart.aggregate([
        {
            $match: {
                user_id: new mongoose.Types.ObjectId(userId),
            },
        },

        {
            $unwind: '$items',
        },

        {
            $group: {
                _id: null,

                subtotal: {
                    $sum: {
                        $multiply: [
                            '$items.price',
                            '$items.quantity',
                        ],
                    },
                },

                cartLength: {
                    $sum: '$items.quantity',
                },
            },
        },

        {
            $project: {
                _id: 0,

                subtotal: 1,

                tax: {
                    $round: [
                        {
                            $multiply: ['$subtotal', 0.02],
                        },
                        2,
                    ],
                },

                total: {
                    $add: [
                        '$subtotal',
                        {
                            $round: [
                                {
                                    $multiply: [
                                        '$subtotal',
                                        0.02,
                                    ],
                                },
                                2,
                            ],
                        },
                    ],
                },

                cartLength: 1,
            },
        },
    ])

    return (
        summary[0] || {
            subtotal: 0,
            tax: 0,
            total: 0,
            cartLength: 0,
        }
    )
}

// ─────────────────────────────────────────────────────────────
// LOAD CART
// ─────────────────────────────────────────────────────────────

const loadCart = asyncHandler(async (req, res) => {
    const userId = req.session.user._id

    let cart = await Cart.findOne({
        user_id: userId,
    })

    if (!cart || cart.items.length === 0) {
        return res.render('user/cart', {
            layout: 'layouts/user_main',

            cartItems: [],

            subtotal: 0,
            tax: 0,
            total: 0,

            cartLength: 0,

            displayCartLength: '0',

            error: req.query.error || null,
        })
    }

    const cartItems = []

    let subtotal = 0
    let modified = false
    let stockAdjusted = false

    for (const item of cart.items) {
        

        const product = await Product.findById(
            item.product_id
        ).lean()

        if (
            !product ||
            product.isDeleted ||
            !product.isListed
        ) {
            cart.items.pull(item._id)
            modified = true
            continue
        }

        // CATEGORY VALIDITY

        const category = await Category.findById(
            product.category_id
        ).lean()

        if (
            !category ||
            category.isDeleted ||
            !category.isListed
        ) {
            cart.items.pull(item._id)
            modified = true
            continue
        }

        // BRAND VALIDITY

        const brand = await Brand.findById(
            product.brand_id
        ).lean()

        if (
            !brand ||
            brand.isDeleted ||
            !brand.isActive
        ) {
            cart.items.pull(item._id)
            modified = true
            continue
        }

        // VARIANT VALIDITY

        const variant = findVariant(
            product,
            item.variant_id
        )

        if (!variant) {
            cart.items.pull(item._id)
            modified = true
            continue
        }

        // STOCK HANDLING

        const availableStock =
            variant.quantity ?? 0

        if (availableStock <= 0) {
            cartItems.push({
                _id: item._id,

                product,

                variant,

                quantity: item.quantity,

                subtotal: 0,

                outOfStock: true,
            })

            continue
        }

        if (item.quantity > availableStock) {
            item.quantity = availableStock

            modified = true
            stockAdjusted = true
        }

        const finalPrice = Number(item.price)

        const itemSubtotal =
            finalPrice * item.quantity

        subtotal += itemSubtotal

        cartItems.push({
            _id: item._id,

            product,

            variant,

            quantity: item.quantity,

            price: finalPrice,

            subtotal: itemSubtotal,

            outOfStock: false,
        })
    }

    if (modified) {
        await cart.save()
    }

    const tax = Math.round(subtotal * 0.02)

    const total = subtotal + tax

    const count = cartCount(cart)

    const hasOutOfStock = cartItems.some(
        (item) => item.outOfStock
    )

    return res.render('user/cart', {
        layout: 'layouts/user_main',

        cartItems,

        subtotal,
        tax,
        total,

        cartLength: count,

        displayCartLength:
            displayCartLength(count),

        hasOutOfStock,

        error: stockAdjusted
            ? 'stockUpdate'
            : req.query.error || null,

        products: req.query.products || null,
    })
})

// ─────────────────────────────────────────────────────────────
// ADD TO CART
// ─────────────────────────────────────────────────────────────

const addToCart = asyncHandler(async (req, res) => {
    const { productId, variantId, quantity } =
        req.body

    const userId = req.session.user?._id

    if (!userId) {
        return res
            .status(httpStatus.unauthorized)
            .json({
                success: false,
                message:
                    messages.CART.CART_ADD_FAILED,
            })
    }

    const qty = parseInt(quantity)

    if (
        !productId ||
        !variantId ||
        isNaN(qty) ||
        qty <= 0
    ) {
        return res
            .status(httpStatus.bad_request)
            .json({
                success: false,
                message:
                    messages.AUTH.INVALID_REQUEST,
            })
    }

    

    const productData = await Product.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(
                    productId
                ),

                isDeleted: false,

                isListed: true,
            },
        },

        {
            $lookup: {
                from: 'categories',

                localField: 'category_id',

                foreignField: '_id',

                as: 'category',
            },
        },

        {
            $lookup: {
                from: 'brands',

                localField: 'brand_id',

                foreignField: '_id',

                as: 'brand',
            },
        },

        {
            $unwind: '$category',
        },

        {
            $unwind: '$brand',
        },

        {
            $match: {
                'category.isDeleted': false,

                'category.isListed': true,

                'brand.isDeleted': false,

                'brand.isActive': true,
            },
        },

        {
            $project: {
                regular_price: 1,

                offer_price: 1,

                variants: {
                    $filter: {
                        input: '$variants',

                        as: 'variant',

                        cond: {
                            $eq: [
                                '$$variant._id',
                                new mongoose.Types.ObjectId(
                                    variantId
                                ),
                            ],
                        },
                    },
                },
            },
        },
    ])

    if (!productData.length) {
        return res
            .status(httpStatus.not_found)
            .json({
                success: false,
                message:
                    messages.PRODUCT
                        .PRODUCT_NOT_FOUND,
            })
    }

    const product = productData[0]

    const variant = product.variants[0]

    if (!variant) {
        return res
            .status(httpStatus.not_found)
            .json({
                success: false,
                message:
                    messages.VARIANT
                        .VARIANT_NOT_FOUND,
            })
    }

    // checking stock

    if (
        variant.quantity <= 0 ||
        variant.quantity < qty
    ) {
        return res
            .status(httpStatus.bad_request)
            .json({
                success: false,
                message:
                    messages.STOCK.OUT_OF_STOCK,
            })
    }

    // checking existing item

    const existingCart = await Cart.findOne(
        {
            user_id: userId,

            items: {
                $elemMatch: {
                    product_id:
                        new mongoose.Types.ObjectId(
                            productId
                        ),

                    variant_id:
                        new mongoose.Types.ObjectId(
                            variantId
                        ),
                },
            },
        },
        {
            'items.$': 1,
        }
    ).lean()

    

    if (existingCart?.items?.length) {
        const existingItem =
            existingCart.items[0]

        if (existingItem.quantity >= 5) {
            return res
                .status(httpStatus.bad_request)
                .json({
                    success: false,
                    message:
                        messages.STOCK
                            .STOCK_ALLOWED,
                })
        }

        if (
            existingItem.quantity + qty >
            5
        ) {
            return res
                .status(httpStatus.bad_request)
                .json({
                    success: false,
                    message:
                        messages.STOCK
                            .STOCK_ALLOWED,
                })
        }

        if (
            existingItem.quantity + qty >
            variant.quantity
        ) {
            return res
                .status(httpStatus.bad_request)
                .json({
                    success: false,
                    message:
                        messages.STOCK
                            .OUT_OF_STOCK,
                })
        }

        // ATOMIC QUANTITY UPDATE

        await Cart.updateOne(
            {
                user_id: userId,

                items: {
                    $elemMatch: {
                        product_id:
                            new mongoose.Types.ObjectId(
                                productId
                            ),

                        variant_id:
                            new mongoose.Types.ObjectId(
                                variantId
                            ),
                    },
                },
            },
            {
                $inc: {
                    'items.$.quantity': qty,
                },
            }
        )
    } else {
        // NEW ITEM

        if (qty > 5) {
            return res
                .status(httpStatus.bad_request)
                .json({
                    success: false,
                    message:
                        messages.STOCK
                            .STOCK_ALLOWED,
                })
        }

        const price = Number(
            product.offer_price ??
                product.regular_price
        )

        await Cart.findOneAndUpdate(
            {
                user_id: userId,
            },
            {
                $push: {
                    items: {
                        product_id: productId,

                        variant_id: variantId,

                        size: variant.size,

                        color: variant.color,

                        quantity: qty,

                        price,
                    },
                },
            },
            {
                upsert: true,
                new: true,
            }
        )
    }

    // REMOVE FROM WISHLIST

    await Wishlist.updateOne(
        {
            user_id: userId,
        },
        {
            $pull: {
                items: {
                    product_id: productId,
                },
            },
        }
    )

    const summary =
        await calculateSummary(userId)

    return res.status(httpStatus.ok).json({
        success: true,

        message: messages.CART.CART_ADD,

        cartLength: summary.cartLength,

        displayCartLength:
            displayCartLength(
                summary.cartLength
            ),
    })
})



const increaseQty = asyncHandler(async (req, res) => {
    const userId = req.session.user._id

    const itemId = req.params.id

    const cart = await Cart.findOne(
        {
            user_id: userId,

            'items._id': itemId,
        },
        {
            'items.$': 1,
        }
    ).lean()

    if (!cart?.items?.length) {
        return res.json({
            success: false,

            message:
                messages.PRODUCT.PRODUCT_NOT_FOUND,
        })
    }

    const item = cart.items[0]

    const product = await Product.findOne(
        {
            _id: item.product_id,

            'variants._id': item.variant_id,
        },
        {
            'variants.$': 1,
        }
    ).lean()

    if (!product) {
        return res.json({
            success: false,

            message:
                messages.PRODUCT.PRODUCT_NOT_FOUND,
        })
    }

    const variant = product.variants[0]

    if (!variant) {
        return res.json({
            success: false,

            message:
                messages.VARIANT
                    .VARIANT_NOT_FOUND,
        })
    }

    if (item.quantity >= variant.quantity) {
        return res.json({
            success: false,

            message:
                messages.STOCK.OUT_OF_STOCK,
        })
    }

    if (item.quantity >= 5) {
        return res.json({
            success: false,

            message:
                messages.STOCK.STOCK_ALLOWED,
        })
    }

    await Cart.updateOne(
        {
            user_id: userId,

            'items._id': itemId,
        },
        {
            $inc: {
                'items.$.quantity': 1,
            },
        }
    )

    const summary =
        await calculateSummary(userId)

    return res.json({
        success: true,

        newQty: item.quantity + 1,

        summary,

        cartLength: summary.cartLength,

        displayCartLength:
            displayCartLength(
                summary.cartLength
            ),
    })
})




const decreaseQty = asyncHandler(async (req, res) => {
    const userId = req.session.user._id

    const itemId = req.params.id

    await Cart.updateOne(
        {
            user_id: userId,

            'items._id': itemId,
        },
        {
            $inc: {
                'items.$.quantity': -1,
            },
        }
    )

    await Cart.updateOne(
        {
            user_id: userId,
        },
        {
            $pull: {
                items: {
                    quantity: {
                        $lte: 0,
                    },
                },
            },
        }
    )

    const updatedCart = await Cart.findOne(
        {
            user_id: userId,

            'items._id': itemId,
        },
        {
            'items.$': 1,
        }
    ).lean()

    const summary =
        await calculateSummary(userId)

    return res.json({
        success: true,

        removed: !updatedCart,

        newQty:
            updatedCart?.items?.[0]
                ?.quantity || 0,

        summary,

        cartLength: summary.cartLength,

        displayCartLength:
            displayCartLength(
                summary.cartLength
            ),
    })
})



const removeItem = asyncHandler(async (req, res) => {
    const userId = req.session.user._id

    const itemId = req.params.id

    await Cart.updateOne(
        {
            user_id: userId,
        },
        {
            $pull: {
                items: {
                    _id: itemId,
                },
            },
        }
    )

    const summary =
        await calculateSummary(userId)

    return res.json({
        success: true,

        removed: true,

        summary,

        cartLength: summary.cartLength,

        displayCartLength:
            displayCartLength(
                summary.cartLength
            ),
    })
})

module.exports = {
    addToCart,
    loadCart,
    increaseQty,
    decreaseQty,
    removeItem,
}