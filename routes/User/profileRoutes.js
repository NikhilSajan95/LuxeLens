const express = require('express')
const router = express.Router()
const { isUser } = require('../../middlewares/authmiddleware')
const { uploadProfile } = require('../../config/cloudinary')
const profileController = require('../../controllers/user/profileUserController')
const userController = require('../../controllers/user/productUserController')


router.get('/', isUser,userController.loadProfile)
router.get('/address', isUser, profileController.loadAddress)
router.post('/address', isUser, profileController.addAddress)


module.exports = router