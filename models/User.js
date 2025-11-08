import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, sparse: true },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date },
  resetOtp: { type: String },
  resetOtpExpiry: { type: Date },
});

export default mongoose.model('User', userSchema);


