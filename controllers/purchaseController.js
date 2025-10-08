import mongoose from 'mongoose';
import Purchase from '../models/Purchase.js';
import Vendor from '../models/Vendor.js';
import { addPurchaseBatches } from '../services/inventoryService.js';

export const createPurchase = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { vendorId, items, totalAmount, paidAmount } = req.body;
    const dueAmount = (totalAmount || 0) - (paidAmount || 0);

    await addPurchaseBatches(items, vendorId, session);

    const purchase = await Purchase.create([{ vendorId, items, totalAmount, paidAmount, dueAmount }], { session });
    await session.commitTransaction();
    res.status(201).json(purchase[0]);
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};


