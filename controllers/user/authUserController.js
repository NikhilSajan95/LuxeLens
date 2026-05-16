const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const {loginUserService, signupOtpService, verifyOtpService, 
     resetPasswordService, resendOtpService } = require('../../services/user/authUserServices')


const loadLogin = asyncHandler(async (req,res) =>{
    if(req.session.user) return res.redirect('/');
    res.render('auth/login',{layout:'layouts/userLogin'})
})

const loginUser = asyncHandler(async (req,res) => {
    console.log(req.body)
    const result = await loginUserService(req.body)
    if(result.error) {
        return res.status(result.status).json({success:false,message:result.message})
    }

    req.session.user = {_id:result.user._id}

    return res.json({success:true, message:messages.AUTH.LOGIN_SUCCESS,redirect:'/'})
})

const loadSignup = asyncHandler(async (req,res) =>{
    res.render('auth/signup',{layout:'layouts/userLogin'})
})

const signupUser = asyncHandler( async (req,res) =>{
    const { name, email, password, confirmPassword, mobile} = req.body
    
    if(!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim() || !mobile.trim()) {

        return res.redirect('/auth/signup')
    }
    if(password !== confirmPassword){
        return res.redirect('/auth/signup')
    }

    const result = await signupOtpService({name,email,password,mobile,session:req.session})

    if(result.error) {
        return res.status(result.status).json({success:false,message:result.message})
    }

    return res.json({success:true,message:messages.OTP.SENT,redirect:'/auth/otp'})
})

const forgotPassword = asyncHandler(async (req,res) =>{
    res.render('auth/forgot-pass',{layout:'layouts/userLogin'})
})

const sendResetMail = asyncHandler( async(req,res) =>{
    const result = await sendResetOtpService({
        email:req.body.email,session:req.session
    })

    if(result.error) {
        return res.status(result.status).json({success:false,message:result.message,redirect:result.redirect})
    }

    res.json({success:true,message:result.message,redirect:result.redirect})
})

const resetPassword = asyncHandler(async (req,res) =>{
    res.render('auth/reset-pass',{layout:'layouts/userLogin'})
})

const postResetPassword = asyncHandler(async (req,res) =>{
    const result = await resetPasswordService({
        newPass:req.body.newPass,confirmPass:req.body.confirmPass,session:req.session
    })

    if(result.error) {
        return res.status(result.status).json({success:false,message:result.message})
    }

    res.json({success:true,message:result.message,redirect:result.redirect})
})

const loadOtpPage = asyncHandler(async (req,res)=>{
    if(!req.session.userOtp || !req.session.purpose) {
        return res.redirect('/auth/signup')
    }

    const expiry = req.session.otpExpiry
    res.render('auth/otp',{layout:'layouts/userLogin',expiry})
})

const verifyOtp = asyncHandler(async (req,res) =>{
    const result = await verifyOtpService({
        otp:req.body.otp,session:req.session
    })

    if(result.error) {
        return res.status(result.status).json({success:false,message:result.message})
    }

    req.session.userOtp = null
    req.session.otpExpiry = null
    req.session.userData = null
    req.session.purpose = null

    res.json({success:true,message:result.message,redirect:result.redirect})
})

const resendOtp = asyncHandler(async (req,res)=>{
    const result = await resendOtpService({session:req.session})

    if(result.error) {
        return res.status(result.status).json({success:false,message:result.message})
    }

    res.json({success:true,message:result.message,expiry:result.expiry})
})

module.exports = {loadSignup,loadLogin,loginUser,forgotPassword,resetPassword,signupUser,verifyOtp,loadOtpPage,resendOtp,sendResetMail,postResetPassword}