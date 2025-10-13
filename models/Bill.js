import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
  productName: { type: String },
  mrp: { type: Number, required: true },
  quantity: { type: Number, required: true },
  discountPct: { type: Number, default: 0 },
  gstPct: { type: Number, default: 0 },
  lineAmount: { type: Number, required: true }, // final amount after discount and GST
}, { _id: false });

const billSchema = new mongoose.Schema({
  billNumber: { type: String, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: { type: [billItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, required: true },
  totalGst: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  notes: { type: String },
  billingDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Auto-generate incremental daily bill number: YYYYMMDD-0001
billSchema.pre('save', async function(next) {
  if (this.billNumber) return next();
  try {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `${y}${m}${d}`;
    // Find latest bill for today
    const start = new Date(y, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(y, now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const last = await this.constructor.findOne({ createdAt: { $gte: start, $lte: end }, billNumber: { $regex: `^${prefix}-` } })
      .sort({ billNumber: -1 })
      .select('billNumber')
      .lean();
    let seq = 1;
    if (last && last.billNumber) {
      const parts = last.billNumber.split('-');
      const n = Number(parts[1]);
      if (!Number.isNaN(n)) seq = n + 1;
    }
    this.billNumber = `${prefix}-${String(seq).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Bill', billSchema);
