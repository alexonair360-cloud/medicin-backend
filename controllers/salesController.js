import mongoose from 'mongoose';
import { createSaleWithFefo } from '../services/salesService.js';
import { generateInvoicePdf } from '../utils/pdf.js';
import Invoice from '../models/Invoice.js';

export const createSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, customerId, createdBy } = req.body;
    const { sale, invoice } = await createSaleWithFefo({ items, customerId, createdBy }, session);
    await session.commitTransaction();
    // Generate PDF post-commit and update invoice
    const pdfPath = await generateInvoicePdf(invoice, sale);
    await Invoice.findByIdAndUpdate(invoice._id, { pdfPath }, { new: true });
    res.status(201).json({ sale, invoice: { ...invoice.toObject(), pdfPath } });
  } catch (err) {
    await session.abortTransaction();
    next(err);
  } finally {
    session.endSession();
  }
};


