import Bill from '../models/Bill.js';
import { getExpiringBatches } from '../services/inventoryService.js';
import XLSX from 'xlsx';

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

export const exportExpiryExcel = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    // Get ALL expiring batches directly (no pagination)
    const Batch = (await import('../models/Batch.js')).default;
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    const expiringBatches = await Batch.find({ 
      expiryDate: { $lte: cutoff }, 
      quantity: { $gt: 0 } 
    })
    .populate('medicineId')
    .sort({ expiryDate: 1 })
    .lean();
    
    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    
    const expiryData = [
      ['Expiry Report'],
      [`Expiring within ${days} days`],
      [],
      ['Medicine', 'Batch', 'Expiry Date', 'Quantity'],
      ...expiringBatches.map(b => [
        b.medicineId?.name || '-',
        b.batchNo || '-',
        b.expiryDate ? new Date(b.expiryDate).toLocaleDateString() : '-',
        b.quantity || 0
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(expiryData);
    XLSX.utils.book_append_sheet(wb, ws, 'Expiry Report');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=expiry_report.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

export const exportLowStockExcel = async (req, res, next) => {
  try {
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
    
    // Filter ALL low stock items (no pagination)
    const lowStockItems = medicines.map(m => {
      const qty = stockMap[String(m._id)] || 0;
      const threshold = typeof m.defaultLowStockThreshold === 'number' ? m.defaultLowStockThreshold : 0;
      return { name: m.name, qty, threshold };
    }).filter(r => r.qty <= r.threshold);
    
    // Sort by quantity (lowest first)
    lowStockItems.sort((a, b) => a.qty - b.qty);
    
    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    
    const lowStockData = [
      ['Low Stock Report'],
      [],
      ['Medicine', 'Quantity', 'Threshold'],
      ...lowStockItems.map(r => [
        r.name,
        r.qty,
        r.threshold
      ])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(lowStockData);
    XLSX.utils.book_append_sheet(wb, ws, 'Low Stock Report');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=low_stock_report.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

export const exportSalesExcel = async (req, res, next) => {
  try {
    // Parse date range
    const fromStr = req.query.from;
    const toStr = req.query.to;
    const from = fromStr ? new Date(fromStr) : new Date(0);
    let to = toStr ? new Date(toStr) : new Date();
    if (toStr && toStr.length <= 10) to.setHours(23, 59, 59, 999);

    const match = { createdAt: { $gte: from, $lte: to } };

    // Get summary
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

    // Calculate total cost
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
    const totalProfit = (summaryDoc?.totalSales || 0) - totalCost;

    // Get ALL daily data (no pagination)
    const dailyData = await Bill.aggregate([
      { $match: match },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        orders: { $sum: 1 },
        sales: { $sum: { $ifNull: ["$grandTotal", 0] } },
        discount: { $sum: { $ifNull: ["$totalDiscount", 0] } },
        gst: { $sum: { $ifNull: ["$totalGst", 0] } },
        billIds: { $push: '$_id' }
      } },
      { $sort: { _id: 1 } },
    ]);

    // Calculate profit for each day
    const dailyWithProfit = await Promise.all(dailyData.map(async (r) => {
      const dayBills = await Bill.find({ _id: { $in: r.billIds } }).populate({
        path: 'items.batchId',
        select: 'unitPrice'
      });
      
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

    // Get ALL top customers (no pagination)
    const topCustomers = await Bill.aggregate([
      { $match: match },
      { $group: { _id: '$customerId', orders: { $sum: 1 }, total: { $sum: { $ifNull: ["$grandTotal", 0] } } } },
      { $sort: { total: -1 } },
      { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'cust' } },
      { $unwind: { path: '$cust', preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, customerId: '$_id', name: { $ifNull: ['$cust.name', '-'] }, phone: '$cust.phone', orders: 1, total: 1 } },
    ]);

    // Get ALL top products (no pagination)
    const topProducts = await Bill.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: '$items.productName', qty: { $sum: '$items.quantity' }, sales: { $sum: '$items.lineAmount' } } },
      { $sort: { sales: -1 } },
      { $project: { _id: 0, name: '$_id', qty: 1, sales: 1 } },
    ]);

    // Create Excel workbook
    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
      ['Sales Report'],
      [`From: ${fromStr || 'Beginning'}`, `To: ${toStr || 'Now'}`],
      [],
      ['Summary'],
      ['Total Sales', summaryDoc?.totalSales || 0],
      ['Orders', summaryDoc?.orders || 0],
      ['Profit', Math.round(totalProfit)],
      ['Discount', summaryDoc?.totalDiscount || 0],
      ['GST', summaryDoc?.totalGst || 0],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
    
    // Daily Breakdown Sheet
    const dailySheetData = [
      ['Date', 'Orders', 'Sales', 'Discount', 'GST', 'Net', 'Profit'],
      ...dailyWithProfit.map(r => [
        r.date,
        r.orders,
        r.sales,
        r.discount,
        r.gst,
        r.net,
        r.profit
      ])
    ];
    const wsDaily = XLSX.utils.aoa_to_sheet(dailySheetData);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'Daily Breakdown');
    
    // Top Customers Sheet
    const customersSheetData = [
      ['Customer', 'Phone', 'Orders', 'Total'],
      ...topCustomers.map(c => [
        c.name || '-',
        c.phone || '',
        c.orders,
        c.total
      ])
    ];
    const wsCustomers = XLSX.utils.aoa_to_sheet(customersSheetData);
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Top Customers');
    
    // Top Products Sheet
    const productsSheetData = [
      ['Product', 'Quantity', 'Sales'],
      ...topProducts.map(p => [
        p.name || '-',
        p.qty,
        p.sales
      ])
    ];
    const wsProducts = XLSX.utils.aoa_to_sheet(productsSheetData);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'Top Products');
    
    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers and send file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

