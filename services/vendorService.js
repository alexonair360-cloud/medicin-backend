import Purchase from '../models/Purchase.js';

export const getVendorLedger = async (vendorId) => {
  const purchases = await Purchase.find({ vendorId }).lean();
  const totalPurchases = purchases.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const totalPaid = purchases.reduce((s, p) => s + (p.paidAmount || 0), 0);
  const totalDue = totalPurchases - totalPaid;
  const payments = purchases.flatMap(p => (p.paymentRecords || []).map(r => ({ ...r, purchaseId: p._id })));
  return { vendorId, totalPurchases, totalPaid, totalDue, purchases, payments };
};


