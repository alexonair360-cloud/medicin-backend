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
    const medicines = await Medicine.find({})
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


