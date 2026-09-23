const express = require('express')
const router = express.Router()
const orderController = require('../../controllers/admin/orderAdminController')
const { isAdmin} = require('../../middlewares/authmiddleware')

router.get('order/',isAdmin,orderController.loadOrders)
router.get('order/:orderId',isAdmin,orderController.loadOrderDetails)
router.patch('order/:orderId/items/:itemId/status',isAdmin,orderController.updateItemStatus)
router.patch('order/:orderId/items/:itemId/cancellation/approve',isAdmin,orderController.approveCancellation)
router.patch('order/:orderId/items/:itemId/cancellation/reject',isAdmin,orderController.rejectCancellation)
router.patch('order/:orderId/items/:itemId/return/approve',isAdmin,orderController.approveReturn)
router.patch('order/:orderId/items/:itemId/return/reject',isAdmin,orderController.rejectReturn)

module.exports = router