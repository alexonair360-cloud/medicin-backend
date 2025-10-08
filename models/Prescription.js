import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  morning: { type: Boolean, default: false },
  afternoon: { type: Boolean, default: false },
  night: { type: Boolean, default: false },
  beforeFood: { type: Boolean, default: false },
  afterFood: { type: Boolean, default: false },
}, { _id: false });

const prescriptionMedicineSchema = new mongoose.Schema({
  medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
  dosage: { type: String },
  schedule: { type: scheduleSchema, default: () => ({}) },
  quantityDispensed: { type: Number },
  durationDays: { type: Number },
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  prescriptionDate: { type: Date, default: Date.now },
  medicines: { type: [prescriptionMedicineSchema], default: [] },
  estimatedFinishDate: { type: Date },
  reminderSentCount: { type: Number, default: 0 },
});

export default mongoose.model('Prescription', prescriptionSchema);


