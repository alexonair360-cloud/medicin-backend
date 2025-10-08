import Sale from '../models/Sale.js';
import Batch from '../models/Batch.js';
import { getExpiringBatches } from '../services/inventoryService.js';

export const salesReport = async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const data = await Sale.find({ saleDate: { $gte: from, $lte: to } }).lean();
    const total = data.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    res.json({ total, count: data.length, data });
  } catch (err) {
    next(err);
  }
};

export const expiringBatches = async (req, res, next) => {
  try {
    const days = Number(req.query.days || 15);
    const data = await getExpiringBatches(days);
    res.json(data);
  } catch (err) {
    next(err);
  }
};


