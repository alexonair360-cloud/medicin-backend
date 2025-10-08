import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  orderId: { type: String, required: true },
  orderDate: { type: Date, default: Date.now },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['paid', 'unpaid'], default: 'unpaid' },
  notes: { type: String },
}, { timestamps: true, index: true });

orderSchema.index({ vendorId: 1, orderId: 1 }, { unique: true });

export default mongoose.model('Order', orderSchema);
