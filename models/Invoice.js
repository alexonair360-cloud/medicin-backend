import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, required: true },
  saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  pdfPath: { type: String },
  amount: { type: Number, required: true },
  generatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Invoice', invoiceSchema);


