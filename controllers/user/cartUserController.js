const asyncHandler = require('express-async-handler')
const httpStatus   = require('../../constants/httpStatus')
const {
    addToCartService,
    loadCartService,
    increaseQtyService,
    decreaseQtyService,
    removeItemService,
} = require('../../services/user/cartUserServices')


const addToCart = asyncHandler(async (req, res) => {
    const { productId, variantId, quantity } = req.body
    const userId = req.session.user?._id

    if (!userId) {
        return res
            .status(httpStatus.unauthorized)
            .json({ success: false, message: 'Unauthorized' })
    }

    const qty = parseInt(quantity, 10)
    if (!productId || !variantId || isNaN(qty) || qty <= 0) {
        return res
            .status(httpStatus.bad_request)
            .json({ success: false, message: 'Invalid request' })
    }

    const result = await addToCartService({ productId, variantId, qty, userId })

    return res.status(result.status).json(result)
})


const loadCart = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    const data   = await loadCartService(userId, req.query)

    return res.render('user/cart', {
        layout: 'layouts/user_main',
        ...data,
    })
})


//   PATCH /cart/:id/increase
 
const increaseQty = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    const itemId = req.params.id

    const result = await increaseQtyService({ userId, itemId })
    return res.json(result)
})


const decreaseQty = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    const itemId = req.params.id

    const result = await decreaseQtyService({ userId, itemId })
    return res.json(result)
})

// delete
const removeItem = asyncHandler(async (req, res) => {
    const userId = req.session.user._id
    const itemId = req.params.id

    const result = await removeItemService({ userId, itemId })
    return res.json(result)
})

module.exports = { addToCart, loadCart, increaseQty, decreaseQty, removeItem }