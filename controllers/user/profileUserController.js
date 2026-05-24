const asyncHandler = require('express-async-handler')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const profileService = require('../../services/user/profileUserService')

const loadProfile = asyncHandler(async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login')
    }

    const { user, addresses } = await profileService.getProfileDataService(req.session.user._id)

    if (!user) {
        req.session.destroy()
        return res.redirect('/auth/login')
    }

    res.render('user/profile', { 
        layout: 'layouts/user_main', 
        user, 
        addresses
    })
})

const uploadProfileImage = asyncHandler( async( req,res) => {
    const userId = req.session.user._id

    if(!req.file) {
        return res.json({ success: false, message: messages.FILE.NO_FILE })
    }

    const result = await profileService.updateProfileImageService(userId, req.file.path)
    res.json(result)
})

const loadAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.redirect('/auth/login')
    }

    let page = parseInt(req.query.page) || 1
    const limit = 2
    if(page < 1) page = 1

    const result = await profileService.getAddressPaginatedService(userId, page, limit)

    if (result.redirect) {
        return res.redirect(result.redirectUrl)
    }

    res.render('user/address', {
        layout: 'layouts/user_main',
        addresses: result.addresses,
        currentPage: page,
        totalPages: result.totalPages,
        query: req.query
    })
})

const addAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    if(!userId) {
        return res.status(httpStatus.bad_request).json({ success: false, message: messages.USER.USER_NOT_LOGIN })
    }

    const { fullname, mobile, address, district, state, country, pincode } = req.body

    if(!fullname || !mobile || !address || !district || !state || !country || !pincode) {
        return res.status(httpStatus.bad_request).json({ success: false, message: messages.AUTH.ALL_FIELDS_REQUIRED })
    }

    const result = await profileService.addAddressService(userId, req.body)
    return res.json(result)
})

const updateAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const addressId = req.params.id

    if(!userId) {
        return res.status(httpStatus.bad_request).json({ success: false, message: messages.USER.USER_NOT_LOGIN })
    }

    const { fullname, mobile, address, district, state, country, pincode } = req.body

    if(!fullname || !mobile || !address || !district || !state || !country || !pincode) {
        return res.status(httpStatus.bad_request).json({ success: false, message: messages.AUTH.ALL_FIELDS_REQUIRED })
    }

    const result = await profileService.updateAddressService(userId, addressId, req.body)

    if (result.error) {
        return res.status(result.status).json({ success: false, message: result.message })
    }

    return res.json({ success: true, message: result.message })
})

const deleteAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const addressId = req.params.id

    if(!userId) {
        return res.status(httpStatus.bad_request).json({ success: false, message: messages.USER.USER_NOT_FOUND })
    }

    const result = await profileService.deleteAddressService(userId, addressId)

    if (result.error) {
        return res.status(result.status).json({ success: false, message: result.message })
    }

    return res.json({ success: true, message: result.message })
})

const setDefaultAddress = asyncHandler( async( req,res) => {
    const userId = req.session.user._id
    const addressId = req.params.id

    if(!userId) {
        return res.status(httpStatus.unauthorized).json({ success: false, message: messages.USER.USER_NOT_FOUND })
    }

    const result = await profileService.setDefaultAddressService(userId, addressId)

    if (result.error) {
        return res.status(result.status).json({ success: false, message: result.message })
    }

    return res.json({ success: true, message: result.message })
})

const updateProfile = asyncHandler( async( req,res) => {
    const userId = req.session.user._id

    const result = await profileService.updateProfileService(userId, req.body)

    if (result.error) {
        return res.status(result.status).json({ success: false, message: result.message })
    }

    // If an OTP is required for email change, set the session variables in the controller
    if (result.otpRequired) {
        req.session.userOtp = result.otpData.otp
        req.session.otpExpiry = result.otpData.otpExpiry
        req.session.newEmail = result.otpData.email
        req.session.userId = result.otpData.userId
        req.session.purpose = 'email-change'

        return res.json({ 
            success: true, 
            otpRequired: true, 
            message: result.message, 
            redirect: result.redirect 
        })
    }

    return res.json({ success: true, message: result.message })
})

module.exports = {
    loadProfile,
    uploadProfileImage,
    loadAddress,
    addAddress,
    updateAddress,
    deleteAddress,
    setDefaultAddress,
    updateProfile
}