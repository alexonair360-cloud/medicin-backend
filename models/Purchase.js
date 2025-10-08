import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  batchNo: { type: String, required: true },
  quantity: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  unitPrice: { type: Number, required: true },
});

const paymentRecordSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  mode: { type: String },
  notes: { type: String },
});

const purchaseSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  items: { type: [purchaseItemSchema], default: [] },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  purchaseDate: { type: Date, default: Date.now },
  paymentRecords: { type: [paymentRecordSchema], default: [] },
});

export default mongoose.model('Purchase', purchaseSchema);


