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


