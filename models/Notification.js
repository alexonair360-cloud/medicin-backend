import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  to: { type: String },
  channel: { type: String, enum: ['whatsapp', 'sms'] },
  templateName: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Notification', notificationSchema);


