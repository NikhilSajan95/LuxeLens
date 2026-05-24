const express = require('express')
const router = express.Router()
const { isUser } = require('../../middlewares/authmiddleware')
const passwordController = require('../../controllers/user/passwordUserController')

router.get('/', isUser, passwordController.loadChangePassword)
router.post('/', isUser, passwordController.postChangePassword)

module.exports = router