import mongoose from 'mongoose';

const medicineSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genericName: { type: String },
  brand: { type: String },
  category: { type: String },
  unit: { type: String },
  defaultLowStockThreshold: { type: Number, default: 0 },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Medicine', medicineSchema);


