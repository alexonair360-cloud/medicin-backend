import Customer from '../models/Customer.js';

export const listCustomers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const match = {};
    if (q) {
      const regex = new RegExp(q, 'i');
      match.$or = [
        { name: regex },
        { phone: regex },
        { email: regex },
        { customerId: regex },
      ];
    }

    const customers = await Customer.aggregate([
      { $match: match },
      { $sort: { name: 1 } },
      {
        $lookup: {
          from: 'bills',
          localField: '_id',
          foreignField: 'customerId',
          as: 'bills',
          pipeline: [
            { $project: { grandTotal: 1 } },
          ],
        },
      },
      {
        $addFields: {
          totalOrders: { $size: '$bills' },
          totalSpent: { $sum: '$bills.grandTotal' },
        },
      },
      { $project: { bills: 0 } },
    ]);
    res.json(customers);
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { customerId, name, phone, email, address } = req.body || {};
    
    // If no name provided but phone is provided, use phone as name
    let finalName = name;
    if (!finalName && phone) {
      finalName = `Customer ${phone}`;
    } else if (!finalName) {
      return res.status(400).json({ message: 'Name or phone is required' });
    }
    
    // Check for duplicates only if phone is provided
    if (phone) {
      const dup = await Customer.findOne({ $or: [ { phone }, ...(customerId ? [{ customerId }] : []) ] });
      if (dup) {
        return res.status(409).json({ message: dup.phone === phone ? 'Customer with this phone already exists' : 'Customer ID already exists' });
      }
    }
    
    const created = await Customer.create({ customerId, name: finalName, phone, email, address });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { customerId, name, phone, email, address } = req.body || {};
    if (phone || customerId) {
      // Ensure no duplicate phone or customerId in other documents
      const dup = await Customer.findOne({
        _id: { $ne: id },
        $or: [ ...(phone ? [{ phone }] : []), ...(customerId ? [{ customerId }] : []) ],
      });
      if (dup) {
        return res.status(409).json({ message: dup.phone === phone ? 'Customer with this phone already exists' : 'Customer ID already exists' });
      }
    }
    const updated = await Customer.findByIdAndUpdate(
      id,
      { $set: { customerId, name, phone, email, address } },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Customer not found' });
    res.json(updated);
  } catch (err) {
    // Duplicate phone handling
    if (err?.code === 11000) {
      return res.status(409).json({ message: 'Duplicate value for phone or customerId' });
    }
    next(err);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Customer.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Customer not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
