const express = require('express')
const router = express.Router()
const passport = require('../../config/passport-setup')
const authController = require('../../controllers/user/authUserController')



router.get('/signup',authController.loadSignup)
router.post('/signup',authController.signupUser)

router.post('/login',authController.loginUser)
router.get('/login',authController.loadLogin)

router.get('/forgot-password',authController.forgotPassword)
router.post('/forgot-password',authController.sendResetMail)

router.get('/reset-password',authController.resetPassword)
router.post('/reset-password',authController.postResetPassword)

router.post('/verify-otp',authController.verifyOtp)
router.get('/otp',authController.loadOtpPage)
router.post('/resend-otp',authController.resendOtp)


router.get('/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/google/callback',passport.authenticate('google',{failureRedirect:'/auth/signup'}),async (req,res)=>{
    if(!req.user.is_active) {
        req.session.destroy(() => {
            res.redirect('/auth/login?blocked=true')
        })
        return
    }

    req.session.user = {_id:req.user._id}
    req.session.userOtp = null
    req.session.purpose = null
    req.session.otpExpiry = null
    res.redirect('/')
})

module.exports = router