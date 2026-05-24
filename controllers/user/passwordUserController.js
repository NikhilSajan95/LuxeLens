const asyncHandler = require('express-async-handler')
const User = require('../../models/userModel')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const { changePasswordService } = require('../../services/user/passwordUserService') // Import Service

const loadChangePassword = asyncHandler( async( req,res) => {
    if(!req.session.user) {
        return res.redirect('/auth/login')
    }
    
    const user = await User.findById(req.session.user._id)
    res.render('user/password', {
        layout: 'layouts/user_main',
        title: 'change password',
        isGoogleUser: !!user.googleId
    })
})

const postChangePassword = asyncHandler( async( req,res) => {

    if(!req.session.user || !req.session.user._id) {
        return res.status(httpStatus.unauthorized).json({ success: false, message: messages.AUTH.SESSION_EXPIRED })
    }

    const { currentPassword, newPassword, confirmPassword } = req.body
    const userId = req.session.user._id

    const result = await changePasswordService({  userId, currentPassword, newPassword, confirmPassword })

    if (result.error) {
        return res.status(result.status).json({ 
            success: false, 
            message: result.message 
        })
    }

    return res.status(httpStatus.ok).json({ 
        success: true, 
        message: result.message, 
        redirect: result.redirect 
    })
})

module.exports = { loadChangePassword, postChangePassword }