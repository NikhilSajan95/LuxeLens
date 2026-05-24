const express = require('express')
const router = express.Router()
const { isUser } = require('../../middlewares/authmiddleware')
const checkoutController = require('../../controllers/user/checkoutUserController')


router.get('/', isUser, checkoutController.loadCheckout)
router.post('/orders', isUser, checkoutController.placeOrder)
router.get('/:id/success', isUser, checkoutController.viewOrderSuccess)




module.exports = router;