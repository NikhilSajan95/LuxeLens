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
    CART:{
        CART_ADD_FAILED:'Please login to add to cart',
        CART_ADD:'Item added to cart',
        CART_NOT_FOUND:'Cart not found',
        CART_EMPTY:'Cart is empty! please add items before checkout'
    },
    STOCK:{
        OUT_OF_STOCK:'Not enough stock quantity',
        STOCK_ALLOWED:'Max 5 quantity per product allowed'
    },
    FILE:{
        NO_FILE:'No file uploaded'
    },
    PROFILE:{
        PROFILE_IMG_UPDATE:'Profile image updated successfully',
        PROFILE_IMG_DELETE:'Profile image removed successfully',
    },
    ADDRESS:{
        ADDRESS_ADDED:'Address added successfully',
        ADDRESS_NOT_FOUND:'Address not found',
        ADDRESS_UPDATED:'Address updated successfully',
        ADDRESS_DELETED:'Address deleted successfully',
        DEFAULT_ADDRESS:'Default address updated successfully',
    },
    ORDER:{
        ORDER_NOT_FOUND:'Order not found',
        ORDER_CANNONT_CANCEL:'Order cannot be cancelled at this stage',
        ORDER_CANCELATION_REQUESTED:'Order cancellation requested successfully',
    },
    CANCELLATION:{
        CANCELLATION_APPROVED:'Cancellation approved successfully',
        CANCELLATION_REJECTED:'Cancellation request rejected',
        CANCELLATION_NOT_REQUESTED:'Cancellation is not requested',
    },
    ITEM:{
        ITEM_UPDATED:'Item status updatedd successfully',
        ITEM_CANCELLED:'Item cancelled successfully',
    },
    RETURN:{
        RETURN_REJECT:'Return request rejected',
        RETURN_APPROVED:'Return request approved successfully',
        RETURN_ALLOWED_ONLY_DELIVERED:'Return is allowed only for deliverd products',
        RETURN_ALREDY_SUBMITTED:'Return request already submitted',
        RETURN_SUBMITTED:'Return request submitted successfully',
        RETURN_REASON_REQUIRED:'Return reason required',
        RETURN_NOT_AVAILABLE:'Return available only if all products are delivered',
        RETURN_NOT_REQUESTED:'Return not requested',
    },
});


module.exports = messages