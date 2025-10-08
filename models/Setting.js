import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  lowStockThresholdGlobal: { type: Number, default: 0 },
  expiryAlertDays: { type: Number, default: 15 },
  whatsappTemplates: { type: Object, default: {} },
  smsTemplates: { type: Object, default: {} },
});

export default mongoose.model('Setting', settingSchema);


