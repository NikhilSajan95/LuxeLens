const express = require('express')
const router = express.Router()
const { isUser } = require('../../middlewares/authmiddleware')
const userController = require('../../controllers/user/productUserController')

router.get('/',isUser,userController.loadHome)
router.get('/products',isUser,userController.loadProducts)
router.get('/products/:id', isUser, userController.loadSingleProduct)
router.get('/logout', userController.logoutUser)

module.exports = router