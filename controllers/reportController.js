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

    // Calculate total cost using aggregation to lookup batch unit prices
    const costAgg = await Bill.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $lookup: {
        from: 'batches',
        localField: 'items.batchId',
        foreignField: '_id',
        as: 'batch'
      } },
      { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: null,
        totalCost: {
          $sum: {
            $multiply: [
              { $ifNull: ['$batch.unitPrice', 0] },
              { $ifNull: ['$items.quantity', 0] }
            ]
          }
        }
      } }
    ]);

    const totalCost = costAgg[0]?.totalCost || 0;

    // Profit = Total Sales - Total Cost
    const totalProfit = (summaryDoc?.totalSales || 0) - totalCost;

    const summary = {
      orders: summaryDoc?.orders || 0,
      totalSales: summaryDoc?.totalSales || 0,
      totalDiscount: summaryDoc?.totalDiscount || 0,
      totalGst: summaryDoc?.totalGst || 0,
      totalProfit: Math.round(totalProfit),
      aov: (summaryDoc?.orders ? Math.round((summaryDoc.totalSales || 0) / summaryDoc.orders) : 0),
    };

    // Pagination parameters
    const dailyPage = parseInt(req.query.dailyPage) || 1;
    const customersPage = parseInt(req.query.customersPage) || 1;
    const productsPage = parseInt(req.query.productsPage) || 1;
    const limit = 10;

    // Daily breakdown with pagination and profit calculation
    const dailyPipeline = [
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        sales: { $sum: { $ifNull: ["$grandTotal", 0] } },
        discount: { $sum: { $ifNull: ["$totalDiscount", 0] } },
        gst: { $sum: { $ifNull: ["$totalGst", 0] } },
        billIds: { $push: '$_id' }
      } },
      { $sort: { _id: -1 } },
    ];
    
    const [dailyData, dailyCountData] = await Promise.all([
      Bill.aggregate([
        ...dailyPipeline,
        { $skip: (dailyPage - 1) * limit },
        { $limit: limit }
      ]),
      Bill.aggregate([...dailyPipeline, { $count: 'total' }])
    ]);

    // Calculate profit for each day
    const dailyWithProfit = await Promise.all(dailyData.map(async (r) => {
      // Get bills for this day
      const dayBills = await Bill.find({ _id: { $in: r.billIds } }).populate({
        path: 'items.batchId',
        select: 'unitPrice'
      });
      
      // Calculate cost for this day
      let dayCost = 0;
      dayBills.forEach(bill => {
        bill.items.forEach(item => {
          const unitPrice = item.batchId?.unitPrice || 0;
          const quantity = item.quantity || 0;
          dayCost += unitPrice * quantity;
        });
      });
      
      const profit = r.sales - dayCost;
      
      return {
        date: r._id,
        orders: r.orders,
        sales: r.sales,
        discount: r.discount,
        gst: r.gst,
        net: Math.round(r.sales || 0),
        profit: Math.round(profit)
      };
    }));

    const daily = dailyWithProfit;
    const dailyTotal = dailyCountData[0]?.total || 0;

    // Top customers with pagination
    const customersPipeline = [
      { $match: match },
      { $group: { _id: '$customerId', orders: { $sum: 1 }, total: { $sum: { $ifNull: ["$grandTotal", 0] } } } },
      { $sort: { total: -1 } },
    ];

    const [customersData, customersCountData] = await Promise.all([
      Bill.aggregate([
        ...customersPipeline,
        { $skip: (customersPage - 1) * limit },
        { $limit: limit },
        { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'cust' } },
        { $unwind: { path: '$cust', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, customerId: '$_id', name: { $ifNull: ['$cust.name', '-'] }, phone: '$cust.phone', orders: 1, total: 1 } },
      ]),
      Bill.aggregate([...customersPipeline, { $count: 'total' }])
    ]);

    const topCustomers = customersData;
    const customersTotal = customersCountData[0]?.total || 0;

    // Top products with pagination
    const productsPipeline = [
      { $match: match },
      { $unwind: '$items' },
      { $match: { 'items.productName': { $exists: true, $ne: null } } },
      { $group: {
        _id: '$items.productName',
        qty: { $sum: { $ifNull: ['$_itemsQty', '$items.quantity'] } },
        sales: { $sum: { $ifNull: ['$_itemsLine', '$items.lineAmount'] } },
      } },
      { $sort: { sales: -1 } },
    ];

    const [productsData, productsCountData] = await Promise.all([
      Bill.aggregate([
        ...productsPipeline,
        { $skip: (productsPage - 1) * limit },
        { $limit: limit },
        { $project: { _id: 0, name: '$_id', qty: 1, sales: 1 } },
      ]),
      Bill.aggregate([...productsPipeline, { $count: 'total' }])
    ]);

    const topProducts = productsData;
    const productsTotal = productsCountData[0]?.total || 0;

    res.json({ 
      summary, 
      daily: { items: daily, total: dailyTotal, page: dailyPage, limit },
      topCustomers: { items: topCustomers, total: customersTotal, page: customersPage, limit },
      topProducts: { items: topProducts, total: productsTotal, page: productsPage, limit }
    });
  } catch (err) {
    next(err);
  }
};

export const expiringBatches = async (req, res, next) => {
  try {
    const days = Number(req.query.days || 15);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const data = await getExpiringBatches(days);
    const mapped = (Array.isArray(data) ? data : []).map((b) => ({
      ...b,
      medicineName: b?.medicineId?.name ?? b?.medicineName ?? b?.name,
    }));
    
    // Pagination
    const total = mapped.length;
    const skip = (page - 1) * limit;
    const items = mapped.slice(skip, skip + limit);
    
    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};

export const lowStockReport = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const Medicine = (await import('../models/Medicine.js')).default;
    const Batch = (await import('../models/Batch.js')).default;
    
    // Get all medicines with their stock quantities
    const medicines = await Medicine.find({});
    const stockSummary = await Batch.aggregate([
      { $group: { _id: '$medicineId', totalQty: { $sum: '$quantity' } } }
    ]);
    
    const stockMap = {};
    stockSummary.forEach(s => {
      if (s._id) stockMap[String(s._id)] = s.totalQty || 0;
    });
    
    // Filter low stock items
    const lowStockItems = medicines.map(m => {
      const qty = stockMap[String(m._id)] || 0;
      const threshold = typeof m.defaultLowStockThreshold === 'number' ? m.defaultLowStockThreshold : 0;
      return { id: m._id, name: m.name, qty, threshold };
    }).filter(r => r.qty <= r.threshold);
    
    // Sort by quantity (lowest first)
    lowStockItems.sort((a, b) => a.qty - b.qty);
    
    // Pagination
    const total = lowStockItems.length;
    const skip = (page - 1) * limit;
    const items = lowStockItems.slice(skip, skip + limit);
    
    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    next(err);
  }
};


