const express = require('express')
const router = express.Router()
const { isUser } = require('../../middlewares/authmiddleware')
const cartController = require('../../controllers/user/cartUserController')

router.get('/', isUser, cartController.loadCart)
router.post('/', isUser, cartController.addToCart)
router.patch('/:id/increase', isUser, cartController.increaseQty)
router.patch('/:id/decrease', isUser, cartController.decreaseQty)
router.delete('/:id', isUser, cartController.removeItem)

module.exports = router