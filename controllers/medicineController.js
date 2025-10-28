import Medicine from '../models/Medicine.js';

export const createMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.create(req.body);
    // populate vendor so UI shows Vendor (Phone) immediately
    await medicine.populate('vendorId', 'name phone');
    res.status(201).json(medicine);
  } catch (err) {
    next(err);
  }
};

export const listMedicines = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    
    // Build query
    const query = {};
    if (search) {
      query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
    }
    
    // If pagination params are provided
    if (page && limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      const skip = (pageNum - 1) * limitNum;
      
      const [medicines, total] = await Promise.all([
        Medicine.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .populate('vendorId', 'name phone'),
        Medicine.countDocuments(query)
      ]);
      
      return res.json({
        items: medicines,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      });
    }
    
    // No pagination - return all
    const medicines = await Medicine.find(query)
      .sort({ createdAt: -1 })
      .populate('vendorId', 'name phone');
    res.json(medicines);
  } catch (err) {
    next(err);
  }
};

export const deleteMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Medicine.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Medicine not found' });
    res.json({ ok: true, id });
  } catch (err) {
    next(err);
  }
};

export const updateMedicine = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const updated = await Medicine.findByIdAndUpdate(id, updates, { new: true })
      .populate('vendorId', 'name phone');
    if (!updated) return res.status(404).json({ message: 'Medicine not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};


