const User = require('../../models/userModel')
const asyncHandler = require('express-async-handler')
const messages = require('../../constants/messages')
const httpStatus = require('../../constants/httpStatus')
const Address = require('../../models/addressModel')
const {generateOtp,sendVerificationEmail} = require('../../utils/generator')
const {apiLog} = require('../../config/logger')
const { query } = require('winston')


const loadAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.redirect('/auth/login')
    }

    const page = parseInt(req.query.page) || 1
    const limit = 2

    if(page < 1) page = 1

    const totalAddresses = await Address.countDocuments({user_id:userId})
    const totalPages = Math.ceil(totalAddresses / limit)

    if(totalAddresses === 0) {
        return res.render('user/address',{layout:'layouts/user_main',addresses:[],currentPage:1,totalPages:1,query:req.query})
    }
    
    if(page > totalPages) {
        return res.redirect(`/profile/address?page=${totalPages}`)
    }

    const skip = (page - 1) * limit

    const addresses = await Address.find({user_id:userId}).skip(skip).limit(limit).lean()

    res.render('user/address',{layout:'layouts/user_main',addresses,currentPage:page,totalPages,query:req.query})
})

const addAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.USER.USER_NOT_LOGIN})
    }

    const {fullname,mobile,address,district,state,country,pincode} = req.body

    if(!fullname || !mobile || !address || !district || !state || !country || !pincode) {
        return res.status(httpStatus.bad_request).json({success:false,message:messages.AUTH.ALL_FIELDS_REQUIRED})
    }

    const addressCount = await Address.countDocuments({user_id:userId})

    const newAddress = new Address({
        user_id:userId,
        fullname,
        mobile,
        address,
        district,
        state,
        country,
        pincode,
        is_Default:addressCount === 0
    })

    await newAddress.save()

    return res.json({success:true,message:messages.ADDRESS.ADDRESS_ADDED})
})






module.exports ={loadAddress,addAddress}