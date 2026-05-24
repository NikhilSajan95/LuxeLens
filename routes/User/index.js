const express = require('express')
const router = express.Router()

router.use('/auth', require('./authRoutes'))
router.use('/', require('./productRoutes'))
router.use('/profile', require('./profileRoutes'))
router.use('/password', require('./passwordRoutes'))
router.use('/cart', require('./cartRoutes'))
router.use('/checkout', require('./checkoutRoutes'))





module.exports = router