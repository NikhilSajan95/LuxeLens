const User = require('../../models/userModel')
const Address = require('../../models/addressModel')
const { generateOtp, sendVerificationEmail } = require('../../utils/generator')
const { apiLog } = require('../../config/logger')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')

const getProfileDataService = async (userId) => {
    const user = await User.findById(userId).lean()
    const addresses = await Address.find({ user_id: userId }).lean()
    return { user, addresses }
}

const updateProfileImageService = async (userId, imagePath) => {
    await User.findByIdAndUpdate(userId, { profile_image: imagePath })
    return { success: true, image: imagePath, message: messages.PROFILE.PROFILE_IMG_UPDATE }
}

const getAddressPaginatedService = async (userId, page, limit) => {
    const totalAddresses = await Address.countDocuments({ user_id: userId })
    const totalPages = Math.ceil(totalAddresses / limit)

    if (totalAddresses === 0) {
        return { totalAddresses: 0, addresses: [], totalPages: 1 }
    }

    if (page > totalPages) {
        return { redirect: true, redirectUrl: `/profile/address?page=${totalPages}` }
    }

    const skip = (page - 1) * limit
    const addresses = await Address.find({ user_id: userId }).skip(skip).limit(limit).lean()

    return { totalAddresses, addresses, totalPages }
}

const addAddressService = async (userId, data) => {
    const { fullname, mobile, address, district, state, country, pincode } = data

    const addressCount = await Address.countDocuments({ user_id: userId })

    const newAddress = new Address({
        user_id: userId,
        fullname,
        mobile,
        address,
        district,
        state,
        country,
        pincode,
        is_Default: addressCount === 0
    })

    await newAddress.save()
    return { success: true, message: messages.ADDRESS.ADDRESS_ADDED }
}

const updateAddressService = async (userId, addressId, data) => {
    const { fullname, mobile, address, district, state, country, pincode } = data

    // Business Logic Validations
    if (!/^[0-9]{10}$/.test(mobile)) {
        return { error: true, status: httpStatus.bad_request, message: messages.AUTH.ENTER_VALID_NO }
    }

    if (!/^[0-9]{6}$/.test(pincode)) {
        return { error: true, status: httpStatus.bad_request, message: messages.AUTH.ENTER_VALID_PINCODE }
    }

    const updated = await Address.findOneAndUpdate(
        { _id: addressId, user_id: userId },
        { $set: { fullname, mobile, address, district, state, country, pincode } },
        { new: true, runValidators: true }
    )

    if (!updated) {
        return { error: true, status: httpStatus.not_found, message: messages.ADDRESS.ADDRESS_NOT_FOUND }
    }

    return { success: true, message: messages.ADDRESS.ADDRESS_UPDATED }
}

const deleteAddressService = async (userId, addressId) => {
    const deleted = await Address.findByIdAndDelete({ _id: addressId, user_id: userId })

    if (!deleted) {
        return { error: true, status: httpStatus.not_found, message: messages.ADDRESS.ADDRESS_NOT_FOUND }
    }

    return { success: true, message: messages.ADDRESS.ADDRESS_DELETED }
}

const setDefaultAddressService = async (userId, addressId) => {
    await Address.updateMany({ user_id: userId }, { $set: { is_Default: false } })

    const updated = await Address.findOneAndUpdate(
        { _id: addressId, user_id: userId }, { $set: { is_Default: true } }, { new: true }
    )

    if (!updated) {
        return { error: true, status: httpStatus.not_found, message: messages.ADDRESS.ADDRESS_NOT_FOUND }
    }

    return { success: true, message: messages.ADDRESS.DEFAULT_ADDRESS }
}

const updateProfileService = async (userId, data) => {
    const { fullname, email, mobile, address } = data
    const user = await User.findById(userId)

    if (!user) {
        return { error: true, status: httpStatus.not_found, message: messages.USER.USER_NOT_FOUND }
    }

    // Default address update
    if (address) {
        await Address.updateMany(
            { user_id: userId }, { $set: { is_Default: false } }
        )
        await Address.findByIdAndUpdate(address, { $set: { is_Default: true } })
    }

    if (user.googleId) {
        await User.findByIdAndUpdate(userId, { name: fullname, mobile })
        return { success: true, message: messages.PROFILE.PROFILE_UPDATED }
    }

    // Standard User - Check for email change
    if (email && email !== user.email) {
        const otp = generateOtp()
        const otpExpiry = Date.now() + 2 * 60 * 1000

        const emailSent = await sendVerificationEmail(email, otp)
        if (!emailSent) {
            return { error: true, status: httpStatus.internal_server_error, message: messages.OTP.FAILED }
        }
        apiLog.info(`Email change OTP sent successfully to ${email}: ${otp}`)

        return { 
            otpRequired: true, 
            otpData: { otp, otpExpiry, email, userId },
            message: messages.OTP.SENT, 
            redirect: '/auth/otp' 
        }
    }

    // Standard User - No email change
    await User.findByIdAndUpdate(userId, { name: fullname, mobile })
    return { success: true, message: messages.PROFILE.PROFILE_UPDATED }
}

module.exports = {
    getProfileDataService,
    updateProfileImageService,
    getAddressPaginatedService,
    addAddressService,
    updateAddressService,
    deleteAddressService,
    setDefaultAddressService,
    updateProfileService
}