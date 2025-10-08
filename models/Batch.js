import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNo: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number },
  mrp: { type: Number },
  expiryDate: { type: Date, required: true },
  manufacturingDate: { type: Date },
  discountPercent: { type: Number },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
  purchaseDate: { type: Date },
});

batchSchema.index({ medicineId: 1, expiryDate: 1 });
batchSchema.index({ batchNo: 1 });

export default mongoose.model('Batch', batchSchema);


