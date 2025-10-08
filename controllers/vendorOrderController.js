import mongoose from 'mongoose';
import Order from '../models/Order.js';

export const listVendorOrders = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const q = { vendorId };
    const status = (req.query.status || '').toLowerCase();
    if (status === 'paid' || status === 'unpaid') {
      q.status = status;
    }
    const orders = await Order.find(q).sort({ orderDate: -1, createdAt: -1 }).lean();
    res.json(orders);
  } catch (err) { next(err); }
};

export const createVendorOrder = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const payload = {
      vendorId,
      orderId: req.body.orderId,
      orderDate: req.body.orderDate ? new Date(req.body.orderDate) : new Date(),
      totalAmount: typeof req.body.totalAmount === 'number' ? req.body.totalAmount : (req.body.totalAmount ? Number(req.body.totalAmount) : 0),
      paidAmount: typeof req.body.paidAmount === 'number' ? req.body.paidAmount : (req.body.paidAmount ? Number(req.body.paidAmount) : 0),
      status: req.body.status || 'unpaid',
      notes: req.body.notes,
    };
    if (!payload.orderId) return res.status(400).json({ message: 'orderId is required' });
    const created = await Order.create(payload);
    res.status(201).json(created);
  } catch (err) { next(err); }
};

export const getVendorOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).lean();
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) { next(err); }
};

export const updateVendorOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {
      orderId: req.body.orderId,
      orderDate: req.body.orderDate ? new Date(req.body.orderDate) : undefined,
      totalAmount: typeof req.body.totalAmount === 'number' ? req.body.totalAmount : (req.body.totalAmount ? Number(req.body.totalAmount) : undefined),
      paidAmount: typeof req.body.paidAmount === 'number' ? req.body.paidAmount : (req.body.paidAmount ? Number(req.body.paidAmount) : undefined),
      status: req.body.status,
      notes: req.body.notes,
    };
    const updated = await Order.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Order not found' });
    res.json(updated);
  } catch (err) { next(err); }
};

export const deleteVendorOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Order.findByIdAndDelete(id).lean();
    if (!removed) return res.status(404).json({ message: 'Order not found' });
    res.json({ success: true });
  } catch (err) { next(err); }
};

export const outstandingSummary = async (req, res, next) => {
  try {
    const result = await Order.aggregate([
      {
        $project: {
          vendorId: 1,
          remaining: {
            $max: [
              { $subtract: [ { $ifNull: ['$totalAmount', 0] }, { $ifNull: ['$paidAmount', 0] } ] },
              0
            ]
          }
        }
      },
      { $group: { _id: null, totalOutstanding: { $sum: '$remaining' } } },
    ]);
    const totalOutstanding = result?.[0]?.totalOutstanding || 0;
    res.json({ totalOutstanding });
  } catch (err) { next(err); }
};

export const outstandingForVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const result = await Order.aggregate([
      { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
      {
        $project: {
          remaining: {
            $max: [
              { $subtract: [ { $ifNull: ['$totalAmount', 0] }, { $ifNull: ['$paidAmount', 0] } ] },
              0
            ]
          }
        }
      },
      { $group: { _id: '$vendorId', totalOutstanding: { $sum: '$remaining' } } },
    ]);
    const totalOutstanding = result?.[0]?.totalOutstanding || 0;
    res.json({ totalOutstanding });
  } catch (err) { next(err); }
};
