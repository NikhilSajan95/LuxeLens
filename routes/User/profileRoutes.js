const express = require('express')
const router = express.Router()
const { isUser } = require('../../middlewares/authmiddleware')
const { uploadProfile } = require('../../config/cloudinary')
const profileController = require('../../controllers/user/profileUserController')
const userController = require('../../controllers/user/productUserController')


router.get('/', isUser,profileController.loadProfile)
router.post('/upload', isUser, uploadProfile.single('profile_image'), profileController.uploadProfileImage)
router.get('/address', isUser, profileController.loadAddress)
router.post('/address', isUser, profileController.addAddress)
router.put('/address/:id', isUser, profileController.updateAddress)
router.delete('/address/:id', isUser, profileController.deleteAddress)
router.patch('/address/:id/default', isUser, profileController.setDefaultAddress)
router.post('/update', isUser, profileController.updateProfile)



module.exports = router