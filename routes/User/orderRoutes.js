const express = require('express')
const router = express.Router()
const { isUser } = require('../../middlewares/authmiddleware')
const orderController = require('../../controllers/user/orderUserController')

router.get('/', isUser, orderController.loadOrders)
router.get('/:orderId', isUser, orderController.loadOrderTracking)
router.post('/:orderId/item/:itemId/cancel', isUser, orderController.cancelSingleOrder)
router.post('/:orderId/cancel',isUser,orderController.cancelEntireOrder)
router.get('/:orderId/invoice',isUser,orderController.downloadInvoice)
router.post('/:orderId/item/:itemId/return',isUser,orderController.returnSingleOrder)
router.post('/:orderId/return',isUser,orderController.returnEntireOrder)


module.exports = router