import mongoose from 'mongoose';
import Sale from '../models/Sale.js';
import Invoice from '../models/Invoice.js';
import { fefoDeduct } from './inventoryService.js';
import { generateInvoicePdf } from '../utils/pdf.js';

const generateInvoiceNumber = () => `INV-${Date.now()}`;

export const createSaleWithFefo = async ({ items, customerId, createdBy }, session) => {
  let totalAmount = 0;
  const saleItems = [];

  for (const item of items) {
    const deductions = await fefoDeduct(item.medicineId, item.quantity, session);
    const unitPrice = deductions[0]?.unitPrice || item.unitPrice || 0;
    saleItems.push({
      medicineId: item.medicineId,
      batchNo: deductions.map(d => d.batchNo).join(','),
      quantity: item.quantity,
      unitPrice,
      discount: item.discount || 0,
      tax: item.tax || 0,
    });
    totalAmount += unitPrice * item.quantity;
  }

  const sale = await Sale.create([{
    customerId: customerId || undefined,
    items: saleItems,
    totalAmount,
    paidAmount: totalAmount,
    dueAmount: 0,
    createdBy: createdBy || undefined,
  }], { session });

  const invoice = await Invoice.create([{
    invoiceNumber: generateInvoiceNumber(),
    saleId: sale[0]._id,
    amount: totalAmount,
  }], { session });

  sale[0].invoiceId = invoice[0]._id;
  await sale[0].save({ session });

  // Generate PDF after commit by returning a hook
  return { sale: sale[0], invoice: invoice[0] };
};


