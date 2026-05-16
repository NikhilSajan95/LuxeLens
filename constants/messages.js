const messages = Object.freeze({
    AUTH:{
        USER_NOT_FOUND: 'User not found',
        USER_EXISTS: 'User already exists',
        NUMBER_EXISTS: 'Number already exists',
        SESSION_EXPIRED: 'Session expired. Please try again',
        PASSWORD_MISMATCH: 'Passwords do not match',
        PASSWORD_OLD_ERROR:'Current password is wrong',
        PASSWORD_SAME:'Old and new passwords should not be same',
        PASSWORD_CREATED:'Password created successfully',
        PASSWORD_INVALID: 'Password does not match',
        PASSWORD_RESET_SUCCESS: 'Password reset successful',
        LOGIN_SUCCESS: 'Login successful',
        LOGIN_FAILED: 'Invalid email or password',
        ACCOUNT_BLOCKED: 'Your account has been blocked by the admin',
        LOGOUT_SUCCESS: 'Logged out successfully',
        LOGOUT_FAILED: 'Logout failed',
        SIGNUP_SUCCESS: 'Signup successful',
        INVALID_REQUEST:'Invalid request',
        ALL_FIELDS_REQUIRED:'All fields are required',
        ENTER_VALID_NO:'Enter a valid 10 digit number',
        ENTER_VALID_PINCODE:'Enter a valid 6 digit pincode',
        INVALID_SIGN:'Invalid signature',
        LOGIN_REQUIRED:'Login required',

    },
     OTP: {
        SENT: 'OTP sent successfully',
        FAILED: 'Email send failed',
        EXPIRED: 'OTP has expired. Please try again',
        VERIFIED: 'OTP verified. Redirecting...',
        INVALID_PURPOSE: 'Invalid OTP purpose. Please restart the process.',
        VERIFICATION_FAILED: 'OTP Verification failed, Please try again',
        RESENT: 'OTP resent successfully',
        RESEND_FAILED: 'Failed to resend OTP. Please try again',
        EMAIL_NOT_FOUND: 'Email not found in session'
    },
    ADMIN: {
        INVALID_EMAIL: "Invalid email",
        INVALID_PASSWORD: "Invalid password",
        INVALID_CREDENTIALS: "Invalid credentials",
        WELCOME: "Welcome back Admin"
    },
    PROFILE:{
        PROFILE_UPDATED:'Profile updated successfully'
    },
})


module.exports = messages