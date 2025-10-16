import Bill from '../models/Bill.js';
import { getExpiringBatches } from '../services/inventoryService.js';

export const salesReport = async (req, res, next) => {
  try {
    // Parse date range (inclusive). If only date provided, include end of day.
    const fromStr = req.query.from;
    const toStr = req.query.to;
    const from = fromStr ? new Date(fromStr) : new Date(0);
    let to = toStr ? new Date(toStr) : new Date();
    if (toStr && toStr.length <= 10) to.setHours(23, 59, 59, 999);

    const match = { createdAt: { $gte: from, $lte: to } };

    // Summary: totals across bills
    const [summaryDoc] = await Bill.aggregate([
      { $match: match },
      { $group: {
        _id: null,
        orders: { $sum: 1 },
        totalSales: { $sum: { $ifNull: ["$grandTotal", 0] } },
        totalDiscount: { $sum: { $ifNull: ["$totalDiscount", 0] } },
        totalGst: { $sum: { $ifNull: ["$totalGst", 0] } },
      } },
    ]);

    const summary = {
      orders: summaryDoc?.orders || 0,
      totalSales: summaryDoc?.totalSales || 0,
      totalDiscount: summaryDoc?.totalDiscount || 0,
      totalGst: summaryDoc?.totalGst || 0,
      aov: (summaryDoc?.orders ? Math.round((summaryDoc.totalSales || 0) / summaryDoc.orders) : 0),
    };

    // Daily breakdown
    const daily = await Bill.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        sales: { $sum: { $ifNull: ["$grandTotal", 0] } },
        discount: { $sum: { $ifNull: ["$totalDiscount", 0] } },
        gst: { $sum: { $ifNull: ["$totalGst", 0] } },
      } },
      { $sort: { _id: 1 } },
    ]).then(rows => rows.map(r => ({
      date: r._id,
      orders: r.orders,
      sales: r.sales,
      discount: r.discount,
      gst: r.gst,
      net: Math.round((r.sales || 0)),
    })));

    // Top customers (limit 10)
    const topCustomers = await Bill.aggregate([
      { $match: match },
      { $group: { _id: '$customerId', orders: { $sum: 1 }, total: { $sum: { $ifNull: ["$grandTotal", 0] } } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'cust' } },
      { $unwind: { path: '$cust', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, customerId: '$_id', name: { $ifNull: ['$cust.name', '-'] }, phone: '$cust.phone', orders: 1, total: 1 } },
    ]);

    // Top products by billed items (limit 10)
    const topProducts = await Bill.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $match: { 'items.productName': { $exists: true, $ne: null } } },
      { $group: {
        _id: '$items.productName',
        qty: { $sum: { $ifNull: ['$_itemsQty', '$items.quantity'] } },
        sales: { $sum: { $ifNull: ['$_itemsLine', '$items.lineAmount'] } },
      } },
      { $sort: { sales: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, name: '$_id', qty: 1, sales: 1 } },
    ]);

    res.json({ summary, daily, topCustomers, topProducts });
  } catch (err) {
    next(err);
  }
};

export const expiringBatches = async (req, res, next) => {
  try {
    const days = Number(req.query.days || 15);
    const data = await getExpiringBatches(days);
    const mapped = (Array.isArray(data) ? data : []).map((b) => ({
      ...b,
      medicineName: b?.medicineId?.name ?? b?.medicineName ?? b?.name,
    }));
    res.json(mapped);
  } catch (err) {
    next(err);
  }
};


