const nodemailer = require('nodemailer')

function generateOtp() {
    return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp) {
    try {
        
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:` <${process.env.NODEMAILER_EMAIL}>`,
            to:email,
            subject:'LuxeLens Account Verification – Your OTP Code',
            html:`
                    <div style="font-family: Arial, sans-serif; padding: 20px; background:#f8f9fa; border-radius:8px;">
                        <h2 style="color:#2a7ae2;">Welcome to LuxeLens!</h2>
                        <p style="font-size:16px; color:#333;">Use the verification code below to securely verify your account:</p>
                        
                        <div style="
                            margin:20px 0;
                            padding:15px;
                            background:#ffffff;
                            border:1px solid #ddd;
                            border-radius:6px;
                            display:inline-block;
                            font-size:28px;
                            font-weight:bold;
                            letter-spacing:4px;
                            color:#2a7ae2;
                        ">
                            ${otp}
                        </div>

                        <p style="font-size:14px; color:#555;">
                            This code is valid for the next <b>2 minutes</b>.  
                            If you didn’t request this, please ignore this message.
                        </p>

                        <p style="margin-top:25px; font-size:14px; color:#888;">
                            — LuxeLens Support Team
                        </p>
                    </div>
                `
        })

        if (info.accepted.length > 0) {

            console.log('Email successfully sent to:', email);
            return true

        } else {

            console.log('Failed to send email to:', email);
            return false

        }

    } catch (error) {
        console.error('Error sending email',error)
        return false
    }
}

module.exports = {generateOtp,sendVerificationEmail}