import Bill from '../models/Bill.js';
import Batch from '../models/Batch.js';
import nodemailer from 'nodemailer';
import Customer from '../models/Customer.js';

const roundINR = (n) => Math.round(Number(n || 0));

const computeLine = (item) => {
  const mrp = Number(item.mrp || 0);
  const qty = Math.max(0, Number(item.quantity || 0));
  const discountPct = Math.max(0, Number(item.discountPct || 0));
  const gstPct = Math.max(0, Number(item.gstPct || 0));
  const base = mrp * qty;
  const afterDiscount = base * (1 - discountPct / 100);
  const total = roundINR(afterDiscount * (1 + gstPct / 100));
  return { base, afterDiscount, total };
};

const computeTotals = (items = []) => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalGst = 0;
  let grandTotal = 0;
  items.forEach((it) => {
    const { base, afterDiscount, total } = computeLine(it);
    subtotal += base;
    totalDiscount += base - afterDiscount;
    totalGst += total - afterDiscount;
    grandTotal += total;
  });
  return {
    subtotal: roundINR(subtotal),
    totalDiscount: roundINR(totalDiscount),
    totalGst: roundINR(totalGst),
    grandTotal: roundINR(grandTotal),
  };
};

export const listBills = async (req, res, next) => {
  try {
    const { customerId, billNumber, startDate, endDate, page, limit } = req.query;
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (billNumber) filter.billNumber = { $regex: billNumber, $options: 'i' };
    
    // Optional date range filter (inclusive)
    if (startDate || endDate) {
      const createdAt = {};
      if (startDate) {
        const s = new Date(startDate);
        if (!isNaN(s)) createdAt.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        if (!isNaN(e)) {
          // set to end of the day if just a date
          if (endDate.length <= 10) e.setHours(23, 59, 59, 999);
          createdAt.$lte = e;
        }
      }
      if (Object.keys(createdAt).length) filter.createdAt = createdAt;
    }
    
    // If pagination params are provided
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 15;
      const skip = (pageNum - 1) * limitNum;
      
      const [bills, total] = await Promise.all([
        Bill.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('customerId', 'customerId name phone email'),
        Bill.countDocuments(filter)
      ]);
      
      return res.json({
        items: bills,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    }
    
    // No pagination - return all
    const bills = await Bill.find(filter).sort({ createdAt: -1 }).populate('customerId', 'customerId name phone email');
    res.json(bills);
  } catch (err) {
    next(err);
  }
};

export const getBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('customerId', 'customerId name phone email');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) { next(err); }
};

export const createBill = async (req, res, next) => {
  try {
    const { customerId, items = [], notes } = req.body || {};
    // customerId is now optional - can be null for bills without customer
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'items are required' });

    // Validate and deduct inventory from batches
    for (const item of items) {
      if (item.batchId && item.quantity > 0) {
        const batch = await Batch.findById(item.batchId);
        if (!batch) {
          return res.status(400).json({ message: `Batch ${item.batchNo || item.batchId} not found` });
        }
        if (batch.quantity < item.quantity) {
          return res.status(400).json({ message: `Insufficient stock in batch ${batch.batchNo}. Available: ${batch.quantity}` });
        }
      }
    }

    // Deduct inventory
    for (const item of items) {
      if (item.batchId && item.quantity > 0) {
        await Batch.findByIdAndUpdate(item.batchId, {
          $inc: { quantity: -item.quantity }
        });
      }
    }

    // normalize items, compute line amounts and filter out empty/zero lines
    const normItems = items
      .map((it) => {
        const mrp = Number(it.mrp || 0);
        const quantity = Number(it.quantity || 0);
        const discountPct = Number(it.discountPct || 0);
        const gstPct = Number(it.gstPct || 0);
        const { total } = computeLine({ mrp, quantity, discountPct, gstPct });
        return {
          medicineId: it.medicineId || undefined,
          batchId: it.batchId || undefined,
          productName: (it.productName || '').trim() || undefined,
          batchNo: (it.batchNo || '').trim() || undefined,
          mrp,
          quantity,
          discountPct,
          gstPct,
          lineAmount: total,
        };
      })
      .filter((it) => (it.productName && it.quantity > 0 && it.mrp > 0 && it.lineAmount > 0));

    if (normItems.length === 0) return res.status(400).json({ message: 'no valid items to bill' });

    const totals = computeTotals(normItems);
    
    // Create bill object
    const billData = {
      items: normItems,
      ...totals,
      notes: notes || undefined,
    };
    
    // Only add customerId if it exists
    if (customerId) {
      billData.customerId = customerId;
    }
    
    const doc = await Bill.create(billData);
    
    // Denormalize counters on Customer (only if customerId exists)
    if (customerId) {
      try {
        await Customer.findByIdAndUpdate(customerId, {
          $inc: { totalOrders: 1, totalSpent: totals.grandTotal }
        }, { new: false });
      } catch {}
    }
    
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
};

export const deleteBill = async (req, res, next) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    // Denormalize counters on Customer: decrement (only if bill has a customer)
    if (bill.customerId) {
      try {
        const cust = await Customer.findById(bill.customerId).lean();
        if (cust) {
          const newOrders = Math.max(0, (cust.totalOrders || 0) - 1);
          const newSpent = Math.max(0, (cust.totalSpent || 0) - (bill.grandTotal || 0));
          await Customer.findByIdAndUpdate(bill.customerId, { $set: { totalOrders: newOrders, totalSpent: newSpent } });
        }
      } catch {}
    }
    res.json({ message: 'Deleted' });
  } catch (err) { next(err); }
};

export const emailBill = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('customerId', 'name email phone');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    const to = bill.customerId?.email;
    if (!to) return res.status(400).json({ message: 'Customer has no email' });

    const title = `Invoice ${bill.billNumber || bill._id}`;
    const currency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0));
    const itemsRows = (bill.items || [])
      .filter(it => (it?.productName && Number(it?.lineAmount||0) > 0 && Number(it?.mrp||0) > 0 && Number(it?.quantity||0) > 0))
      .map((it, idx) => `
        <tr>
          <td style="padding:6px 4px">${idx + 1}</td>
          <td style="padding:6px 4px">${it.productName}</td>
          <td style="padding:6px 4px;text-align:right">${currency(it.mrp)}</td>
          <td style="padding:6px 4px;text-align:center">${it.quantity}</td>
          <td style="padding:6px 4px;text-align:right">${Number(it.discountPct||0)}%</td>
          <td style="padding:6px 4px;text-align:right">${Number(it.gstPct||0)}%</td>
          <td style="padding:6px 4px;text-align:right">${currency(it.lineAmount)}</td>
        </tr>`).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;color:#000">
        <h2>Thangam Medicals</h2>
        <div style="font-size:12px;margin-bottom:8px">Pharmacy & General Stores</div>
        <div style="font-size:12px;margin-bottom:8px">Phone: 00000 00000</div>
        <div style="margin:10px 0;font-weight:700">Invoice: ${bill.billNumber || bill._id}</div>
        <div style="margin:6px 0"><strong>Customer:</strong> ${bill.customerId?.name || ''}</div>
        <div style="margin:6px 0; font-size:12px">${bill.customerId?.email || ''} ${bill.customerId?.phone ? ' | ' + bill.customerId.phone : ''}</div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr>
              <th style="text-align:left;border-bottom:1px solid #000;padding:6px 4px">#</th>
              <th style="text-align:left;border-bottom:1px solid #000;padding:6px 4px">Product</th>
              <th style="text-align:right;border-bottom:1px solid #000;padding:6px 4px">MRP</th>
              <th style="text-align:center;border-bottom:1px solid #000;padding:6px 4px">Qty</th>
              <th style="text-align:right;border-bottom:1px solid #000;padding:6px 4px">Disc%</th>
              <th style="text-align:right;border-bottom:1px solid #000;padding:6px 4px">GST%</th>
              <th style="text-align:right;border-bottom:1px solid #000;padding:6px 4px">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-top:10px">
          <table style="min-width:260px;font-size:14px">
            <tr><td style="padding:4px 8px">Subtotal</td><td style="padding:4px 8px;text-align:right">${currency(bill.subtotal)}</td></tr>
            <tr><td style="padding:4px 8px">Discount</td><td style="padding:4px 8px;text-align:right">${currency(bill.totalDiscount)}</td></tr>
            <tr><td style="padding:4px 8px">GST</td><td style="padding:4px 8px;text-align:right">${currency(bill.totalGst)}</td></tr>
            <tr><td style="padding:6px 8px;border-top:1px solid #000;font-weight:700">Grand Total</td><td style="padding:6px 8px;text-align:right;border-top:1px solid #000;font-weight:700">${currency(bill.grandTotal)}</td></tr>
          </table>
        </div>
      </div>`;

    const user = process.env.GMAIL_USER || 'thangammedicals@gmail.com';
    const pass = process.env.GMAIL_APP_PASS || 'example-app-passcode';
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `Thangam Medicals <${user}>`,
      to,
      subject: title,
      html,
    });
    res.json({ message: 'Email sent' });
  } catch (err) { next(err); }
};
