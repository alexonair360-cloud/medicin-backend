import { getVendorLedger } from '../services/vendorService.js';
import Vendor from '../models/Vendor.js';

export const vendorStatement = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const ledger = await getVendorLedger(vendorId);
    res.json(ledger);
  } catch (err) {
    next(err);
  }
};

export const listVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find({}).sort({ createdAt: -1 }).lean();
    res.json(vendors);
  } catch (err) {
    next(err);
  }
};

export const getVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id).lean();
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    next(err);
  }
};

export const createVendor = async (req, res, next) => {
  try {
    const payload = {
      name: req.body.name,
      contactPerson: req.body.contactPerson,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      notes: req.body.notes,
      gstNumber: req.body.gstNumber,
      orderId: req.body.orderId,
      orderDate: req.body.orderDate ? new Date(req.body.orderDate) : undefined,
      totalAmount: typeof req.body.totalAmount === 'number' ? req.body.totalAmount : (req.body.totalAmount ? Number(req.body.totalAmount) : undefined),
      status: req.body.status,
    };
    if (!payload.name) return res.status(400).json({ message: 'Name is required' });
    const created = await Vendor.create(payload);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = {
      name: req.body.name,
      contactPerson: req.body.contactPerson,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
      notes: req.body.notes,
      gstNumber: req.body.gstNumber,
      orderId: req.body.orderId,
      orderDate: req.body.orderDate ? new Date(req.body.orderDate) : undefined,
      totalAmount: typeof req.body.totalAmount === 'number' ? req.body.totalAmount : (req.body.totalAmount ? Number(req.body.totalAmount) : undefined),
      status: req.body.status,
    };
    const updated = await Vendor.findByIdAndUpdate(id, updates, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(404).json({ message: 'Vendor not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const removed = await Vendor.findByIdAndDelete(id).lean();
    if (!removed) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};


