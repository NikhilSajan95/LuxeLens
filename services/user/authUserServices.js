const User = require('../../models/userModel')
const bcrypt = require('bcrypt')
const { generateOtp, sendVerificationEmail } = require('../../utils/generator')
const httpStatus = require('../../constants/httpStatus')
const messages = require('../../constants/messages')
const { apiLog } = require('../../config/logger')

const securePassword = async (password) => {
  return bcrypt.hash(password, 10)
}

const loginUserService = async ({ email, password }) => {
  const user = await User.findOne({ email })

  if (!user) {
    return { error: true, status: httpStatus.bad_request, message: messages.AUTH.USER_NOT_FOUND }
  }

  if (!user.is_active) {
    return { error: true, status: httpStatus.forbidden, message: messages.AUTH.ACCOUNT_BLOCKED }
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    return { error: true, status: httpStatus.bad_request, message: messages.AUTH.PASSWORD_INVALID }
  }

  return { error: false, user }
}

const signupOtpService = async ({ name, email, password, mobile, session }) => {
  apiLog.info(`Signup OTP request: ${email}`)
  const emailExists = await User.findOne({ email })
  if (emailExists) {
    return { error: true, status: httpStatus.bad_request, message: messages.USER.USER_EXISTS }
  }

  const mobileExists = await User.findOne({ mobile })
  if (mobileExists) {
    return { error: true, status: httpStatus.bad_request, message: messages.USER.USER_MOB_EXISTS }
  }

  const otp = generateOtp()
  const emailSent = await sendVerificationEmail(email, otp)

  if (!emailSent) {
    return { error: true, status: httpStatus.internal_server_error, message: messages.OTP.FAILED }
  }

  session.userOtp = otp
  session.otpExpiry = Date.now() + 2 * 60 * 1000
  session.userData = { name, email, password, mobile }
  session.purpose = 'signup'

  apiLog.info(`Signup OTP sent: ${email} | OTP: ${otp}`)
  return { error: false }
}

const verifyOtpService = async ({ otp, session }) => {
  if (!session || !session.userOtp || !session.otpExpiry || !session.purpose) {
    return {error: true,status: httpStatus.bad_request,message: messages.AUTH.SESSION_EXPIRED}
  }

  if (Date.now() > session.otpExpiry) {
    return { error: true, status: httpStatus.bad_request, message: messages.OTP.EXPIRED }
  }

  if (parseInt(otp) !== parseInt(session.userOtp)) {
    return { error: true, status: httpStatus.bad_request, message: messages.OTP.VERIFICATION_FAILED }
  }

  if (session.purpose === 'signup') {
    const user = session.userData
    const passwordHash = await securePassword(user.password)

    await User.create({
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      password: passwordHash
    })

    return { error: false, redirect: '/auth/login', message: messages.AUTH.SIGNUP_SUCCESS }
  }

  if (session.purpose === 'forgot-password') {
    if (!session.email) {
      return {error: true,status: httpStatus.bad_request,message: messages.AUTH.SESSION_EXPIRED}
    }

    session.verifiedEmail = session.email
    return { error: false, redirect: '/auth/reset-password', message: messages.OTP.VERIFIED }
  }

  if (session.purpose === 'email-change') {
        if (!session.userId || !session.newEmail) {
            return {error: true,status: httpStatus.bad_request,message: messages.AUTH.SESSION_EXPIRED}
        }
        const userId = session.userId
        const newEmail = session.newEmail

        await User.findByIdAndUpdate(userId, { email: newEmail })

        session.newEmail = null
        session.userId = null

        return {error: false,message: messages.PROFILE.PROFILE_UPDATED,redirect: '/profile'}
  }

  return { error: true, status: httpStatus.bad_request, message: messages.OTP.INVALID_PURPOSE }
}

const sendResetOtpService = async ({ email, session }) => {
  const user = await User.findOne({ email })
  if (!user) {
    apiLog.warn(`Password reset failed - user not found: ${email}`)
    return { error: true, status: httpStatus.not_found, message: messages.AUTH.USER_NOT_FOUND }
  }

  const otp = generateOtp()
  const emailSent = await sendVerificationEmail(email, otp)

  if (!emailSent) {
    apiLog.error(`Password reset OTP email failed: ${email}`)
    return { error: true, status: httpStatus.internal_server_error, message: messages.OTP.FAILED }
  }

  session.userOtp = otp
  session.otpExpiry = Date.now() + 2 * 60 * 1000
  session.email = email
  session.purpose = 'forgot-password'

  apiLog.info(`Password reset OTP sent: ${email} | OTP: ${otp}`)

  return {
    error: false,
    message: messages.OTP.SENT,
    redirect: '/auth/otp'
  }
}

const resetPasswordService = async ({ newPass, confirmPass, session }) => {
  const email = session.verifiedEmail

  if (!email) {
    return { error: true, status: httpStatus.bad_request, message: messages.AUTH.SESSION_EXPIRED }
  }

  if (newPass !== confirmPass) {
    return { error: true, status: httpStatus.bad_request, message: messages.AUTH.PASSWORD_MISMATCH }
  }

  const passwordHash = await securePassword(newPass)

  const user = await User.findOneAndUpdate(
    { email },
    { password: passwordHash },
    { new: true }
  )

  if (!user) {
    return { error: true, status: httpStatus.not_found, message: messages.AUTH.USER_NOT_FOUND }
  }

  session.verifiedEmail = null

  return {
    error: false,
    message: messages.AUTH.PASSWORD_RESET_SUCCESS,
    redirect: '/auth/login'
  }
}

const resendOtpService = async ({ session }) => {
  let email = null

  if (session.purpose === 'signup' && session.userData) {
    email = session.userData.email
  } else if (session.purpose === 'forgot-password' && session.email) {
    email = session.email
  } else if (session.purpose === 'email-change' && session.newEmail) {
    email = session.newEmail
  }

  if (!email) {
    return { error: true, status: httpStatus.bad_request, message: messages.OTP.EMAIL_NOT_FOUND }
  }

  const otp = generateOtp()
  session.userOtp = otp
  session.otpExpiry = Date.now() + 2 * 60 * 1000

  const emailSent = await sendVerificationEmail(email, otp)

  if (!emailSent) {
    apiLog.error(`Resend OTP failed: ${email}`)
    return { error: true, status: httpStatus.internal_server_error, message: messages.OTP.RESEND_FAILED }
  }

  apiLog.info(`OTP resent successfully: ${email} | OTP: ${otp}`)

  return {
    error: false,
    message: messages.OTP.RESENT,
    expiry: session.otpExpiry
  }
}


module.exports = {loginUserService,signupOtpService,verifyOtpService,sendResetOtpService,resetPasswordService,resendOtpService,securePassword}