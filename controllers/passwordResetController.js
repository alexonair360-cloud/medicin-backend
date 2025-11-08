import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// Twilio configuration (dummy credentials for now)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'your_auth_token_here';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

let twilioClient = null;

// Initialize Twilio client
const initTwilio = () => {
  if (!twilioClient) {
    try {
      // Dynamically import twilio when needed
      import('twilio').then((twilioModule) => {
        const twilio = twilioModule.default;
        twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      }).catch(() => {
        console.warn('Twilio not installed. OTP will be logged to console.');
      });
    } catch (error) {
      console.warn('Twilio not available. OTP will be logged to console.');
    }
  }
  return twilioClient;
};

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via Twilio SMS
const sendOTP = async (phone, otp) => {
  const client = initTwilio();
  
  // For development/testing - log OTP to console
  console.log(`📱 OTP for ${phone}: ${otp}`);
  
  // Try to send via Twilio if configured
  if (client && TWILIO_ACCOUNT_SID !== 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx') {
    try {
      await client.messages.create({
        body: `Your password reset OTP is: ${otp}. Valid for 10 minutes.`,
        from: TWILIO_PHONE_NUMBER,
        to: phone
      });
      return { success: true, method: 'sms' };
    } catch (error) {
      console.error('Twilio SMS failed:', error.message);
      return { success: true, method: 'console' };
    }
  }
  
  return { success: true, method: 'console' };
};

// Request OTP - Step 1
export const requestOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required' });
    }
    
    // Find user by phone
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this phone number' });
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with 10-minute expiry
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();
    
    // Send OTP
    const result = await sendOTP(phone, otp);
    
    res.json({ 
      message: 'OTP sent successfully',
      method: result.method,
      // In development, include OTP in response for testing
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
  } catch (err) {
    next(err);
  }
};

// Verify OTP - Step 2
export const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }
    
    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check OTP
    if (!user.resetOtp || user.resetOtp !== otp) {
      return res.status(401).json({ message: 'Invalid OTP' });
    }
    
    // Check expiry
    if (!user.resetOtpExpiry || user.resetOtpExpiry < new Date()) {
      return res.status(401).json({ message: 'OTP has expired' });
    }
    
    // Generate temporary reset token (valid for 15 minutes)
    const resetToken = jwt.sign(
      { sub: user._id, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    
    res.json({ 
      message: 'OTP verified successfully',
      resetToken 
    });
  } catch (err) {
    next(err);
  }
};

// Reset Password - Step 3
export const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }
    
    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
      if (decoded.purpose !== 'password-reset') {
        throw new Error('Invalid token purpose');
      }
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired reset token' });
    }
    
    // Find user
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear OTP fields
    user.passwordHash = passwordHash;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();
    
    // Generate login token
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({ 
      message: 'Password reset successfully',
      token 
    });
  } catch (err) {
    next(err);
  }
};
