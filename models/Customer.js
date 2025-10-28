import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  customerId: { type: String, unique: true },
  name: { type: String, required: true },
  phone: { type: String, sparse: true, unique: true },
  email: { type: String },
  address: { type: String },
  prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],
  totalOrders: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
}, { timestamps: true });

// Auto-generate incremental customer ID: CUST-0001
customerSchema.pre('save', async function(next) {
  if (this.customerId) return next();
  try {
    // Find the latest customer
    const last = await this.constructor.findOne({ customerId: { $regex: '^CUST-' } })
      .sort({ customerId: -1 })
      .select('customerId')
      .lean();
    
    let seq = 1;
    if (last && last.customerId) {
      const parts = last.customerId.split('-');
      const n = Number(parts[1]);
      if (!Number.isNaN(n)) seq = n + 1;
    }
    this.customerId = `CUST-${String(seq).padStart(4, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Customer', customerSchema);


