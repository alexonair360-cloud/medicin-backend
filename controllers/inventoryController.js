import { getLowStockBatches, getStockByMedicine, getLatestBatchPerMedicine } from '../services/inventoryService.js';
import Batch from '../models/Batch.js';

export const lowStock = async (req, res, next) => {
  try {
    const data = await getLowStockBatches();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { medicineId, quantityDelta } = req.body;
    if (!medicineId || typeof quantityDelta !== 'number' || quantityDelta === 0) {
      return res.status(400).json({ message: 'medicineId and non-zero numeric quantityDelta are required' });
    }
    const doc = await Batch.create({
      medicineId,
      batchNo: `ADJ-${Date.now()}`,
      quantity: quantityDelta,
      expiryDate: new Date('2099-12-31'),
      unitPrice: 0,
      mrp: 0,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

export const stockSummary = async (req, res, next) => {
  try {
    const data = await getStockByMedicine();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const latestBatchSummary = async (req, res, next) => {
  try {
    const data = await getLatestBatchPerMedicine();
    res.json(data);
  } catch (err) {
    next(err);
  }
};

export const updateLatestBatch = async (req, res, next) => {
  try {
    const { medicineId, batchNo, expiryDate, manufacturingDate, unitPrice, mrp, discountPercent } = req.body || {};
    if (!medicineId) return res.status(400).json({ message: 'medicineId is required' });
    const latest = await Batch.findOne({ medicineId }).sort({ purchaseDate: -1, expiryDate: -1, _id: -1 });
    if (!latest) return res.status(404).json({ message: 'No batch found for this medicine' });
    if (typeof batchNo === 'string') latest.batchNo = batchNo;
    if (expiryDate) latest.expiryDate = new Date(expiryDate);
    if (manufacturingDate) latest.manufacturingDate = new Date(manufacturingDate);
    if (typeof unitPrice === 'number') latest.unitPrice = unitPrice;
    if (typeof mrp === 'number') latest.mrp = mrp;
    if (typeof discountPercent === 'number') latest.discountPercent = discountPercent;
    await latest.save();
    res.json(latest);
  } catch (err) {
    next(err);
  }
};

export const addBatch = async (req, res, next) => {
  try {
    const { medicineId, batchNo, quantity, expiryDate, unitPrice, mrp, manufacturingDate, discountPercent, vendorId, purchaseDate } = req.body;
    if (!medicineId || typeof quantity !== 'number') {
      return res.status(400).json({ message: 'medicineId and numeric quantity are required' });
    }
    const doc = await Batch.create({
      medicineId,
      batchNo: batchNo || `INIT-${Date.now()}`,
      quantity,
      expiryDate: expiryDate ? new Date(expiryDate) : new Date('2099-12-31'),
      manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : undefined,
      unitPrice: unitPrice || 0,
      mrp: mrp || 0,
      discountPercent: typeof discountPercent === 'number' ? discountPercent : undefined,
      vendorId: vendorId || undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
    });
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

export const listBatches = async (req, res, next) => {
  try {
    const { medicineId, vendorId } = req.query;
    const filter = {};
    if (medicineId) filter.medicineId = medicineId;
    if (vendorId) filter.vendorId = vendorId;
    const batches = await Batch.find(filter)
      .sort({ purchaseDate: -1, expiryDate: -1, _id: -1 })
      .populate('vendorId', 'name phone')
      .populate('medicineId', 'name');
    res.json(batches);
  } catch (err) {
    next(err);
  }
};

export const updateBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {};
    const { batchNo, quantity, expiryDate, manufacturingDate, unitPrice, mrp, discountPercent, vendorId, purchaseDate } = req.body || {};
    if (typeof batchNo === 'string') updates.batchNo = batchNo;
    if (typeof quantity === 'number') updates.quantity = quantity;
    if (expiryDate) updates.expiryDate = new Date(expiryDate);
    if (manufacturingDate) updates.manufacturingDate = new Date(manufacturingDate);
    if (typeof unitPrice === 'number') updates.unitPrice = unitPrice;
    if (typeof mrp === 'number') updates.mrp = mrp;
    if (typeof discountPercent === 'number') updates.discountPercent = discountPercent;
    if (vendorId) updates.vendorId = vendorId;
    if (purchaseDate) updates.purchaseDate = new Date(purchaseDate);
    const updated = await Batch.findByIdAndUpdate(id, updates, { new: true })
      .populate('vendorId', 'name phone')
      .populate('medicineId', 'name');
    if (!updated) return res.status(404).json({ message: 'Batch not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteBatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Batch.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Batch not found' });
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
};

// Aggregate medicine-level stats: total batches, total in-stock sum, and expiring-soon batches count
export const medicineStats = async (req, res, next) => {
  try {
    const expDays = Number(req.query.expDays || 30);
    const now = new Date();
    const soon = new Date(now.getTime() + expDays * 24 * 60 * 60 * 1000);
    const pipeline = [
      {
        $group: {
          _id: '$medicineId',
          totalBatches: { $sum: 1 },
          totalInStock: { $sum: '$quantity' },
          expiringSoonCount: {
            $sum: {
              $cond: [
                { $and: [ { $gte: ['$expiryDate', now] }, { $lte: ['$expiryDate', soon] }, { $gt: ['$quantity', 0] } ] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ];
    const rows = await Batch.aggregate(pipeline);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};


