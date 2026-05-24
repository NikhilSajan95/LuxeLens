const User = require('../../models/userModel')
const bcrypt = require('bcrypt')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')

const changePasswordService = async ({ userId, currentPassword, newPassword, confirmPassword }) => {
  
    const user = await User.findById(userId)

    if (!user) {
        return { error: true, status: httpStatus.not_found, message: messages.AUTH.USER_NOT_FOUND }
    }

    if (user.googleId) {
        if (newPassword !== confirmPassword) {
            return { error: true, status: httpStatus.bad_request, message: messages.AUTH.PASSWORD_MISMATCH }
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        user.password = hashedPassword
        await user.save()

        return { error: false, message: messages.AUTH.PASSWORD_CREATED, redirect: '/profile' }
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) {
        return { error: true, status: httpStatus.bad_request, message: messages.AUTH.PASSWORD_OLD_ERROR }
    }

    if (newPassword !== confirmPassword) {
        return { error: true, status: httpStatus.bad_request, message: messages.AUTH.PASSWORD_MISMATCH }
    }

    const isSame = await bcrypt.compare(newPassword, user.password)
    if (isSame) {
        return { error: true, status: httpStatus.bad_request, message: messages.AUTH.PASSWORD_SAME }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    return { error: false, message: messages.AUTH.PASSWORD_RESET_SUCCESS, redirect: '/profile' }
}

module.exports = {
    changePasswordService
}