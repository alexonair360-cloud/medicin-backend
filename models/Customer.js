import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String },
  address: { type: String },
  prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
});

export default mongoose.model('Customer', customerSchema);


