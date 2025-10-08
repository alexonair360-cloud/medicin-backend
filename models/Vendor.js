import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactPerson: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  notes: { type: String },
  gstNumber: { type: String },
  outstandingBalance: { type: Number, default: 0 },
  // Optional last order metadata for quick tracking in Vendors page
  orderId: { type: String },
  orderDate: { type: Date },
  totalAmount: { type: Number },
  status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
}, { timestamps: true });

export default mongoose.model('Vendor', vendorSchema);


