import mongoose from 'mongoose';
import Batch from '../models/Batch.js';
import Setting from '../models/Setting.js';

export const addPurchaseBatches = async (items, vendorId, session) => {
  const created = [];
  for (const item of items) {
    const doc = await Batch.create([
      {
        medicineId: item.medicineId,
        batchNo: item.batchNo,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        mrp: item.mrp,
        expiryDate: item.expiryDate,
        vendorId,
        purchaseDate: item.purchaseDate || new Date(),
      },
    ], { session });
    created.push(doc[0]);
  }
  return created;
};

export const fefoDeduct = async (medicineId, quantity, session) => {
  let remaining = quantity;
  const affectedBatches = [];

  const cursor = Batch.find({ medicineId, quantity: { $gt: 0 } })
    .sort({ expiryDate: 1 })
    .cursor({ session });

  for await (const batch of cursor) {
    if (remaining <= 0) break;
    const deduct = Math.min(batch.quantity, remaining);
    batch.quantity -= deduct;
    await batch.save({ session });
    affectedBatches.push({ batchNo: batch.batchNo, quantity: deduct, unitPrice: batch.unitPrice || 0 });
    remaining -= deduct;
  }

  if (remaining > 0) {
    throw Object.assign(new Error('Insufficient stock'), { status: 400 });
  }
  return affectedBatches;
};

export const getExpiringBatches = async (days) => {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return Batch.find({ expiryDate: { $lte: cutoff }, quantity: { $gt: 0 } })
    .populate('medicineId')
    .sort({ expiryDate: 1 })
    .lean();
};

export const getLowStockBatches = async () => {
  const settings = await Setting.findOne({}).lean();
  const globalThreshold = settings?.lowStockThresholdGlobal || 0;
  // Aggregate stock by medicine and batch to identify low stock
  const batches = await Batch.find({ quantity: { $gt: 0 } }).populate('medicineId').lean();
  return batches.filter(b => {
    const threshold = b.medicineId?.defaultLowStockThreshold ?? globalThreshold;
    return typeof threshold === 'number' && b.quantity <= threshold;
  });
};

// Returns an array of { _id: <medicineId>, totalQty: <sum of quantities across batches> }
export const getStockByMedicine = async () => {
  const result = await Batch.aggregate([
    { $group: { _id: '$medicineId', totalQty: { $sum: '$quantity' } } },
  ]);
  return result;
};

// Returns latest batch per medicine by purchaseDate desc; falls back to most recent expiryDate when purchaseDate missing
export const getLatestBatchPerMedicine = async () => {
  // Ensure purchaseDate exists in docs considered for sorting by using $ifNull logic
  const result = await Batch.aggregate([
    {
      $addFields: {
        _sortDate: { $ifNull: ['$purchaseDate', '$expiryDate'] },
      },
    },
    { $sort: { _sortDate: -1 } },
    {
      $group: {
        _id: '$medicineId',
        batchNo: { $first: '$batchNo' },
        expiryDate: { $first: '$expiryDate' },
        manufacturingDate: { $first: '$manufacturingDate' },
        unitPrice: { $first: '$unitPrice' },
        mrp: { $first: '$mrp' },
        discountPercent: { $first: '$discountPercent' },
        purchaseDate: { $first: '$_sortDate' },
      },
    },
  ]);
  return result;
};


