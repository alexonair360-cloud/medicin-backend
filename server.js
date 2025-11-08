import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';
import authRoutes from './routes/auth.js';
import medicineRoutes from './routes/medicines.js';
import purchaseRoutes from './routes/purchases.js';
import salesRoutes from './routes/sales.js';
import reportRoutes from './routes/reports.js';
import notificationRoutes from './routes/notifications.js';
import invoiceRoutes from './routes/invoices.js';
import vendorRoutes from './routes/vendors.js';
import inventoryRoutes from './routes/inventory.js';
import settingsRoutes from './routes/settings.js';
import customerRoutes from './routes/customers.js';
import billRoutes from './routes/bills.js';
import passwordResetRoutes from './routes/passwordReset.js';
import { startCronJobs } from './cron/jobs.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health route
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/password-reset', passwordResetRoutes);

// Centralized error handler skeleton
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;

export const startServer = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://13.202.146.173:27017/medical_dev';
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
  // eslint-disable-next-line no-console
  console.log('Database connection successful');

  return new Promise((resolve) => {
    const server = app.listen(PORT, '0.0.0.0', () => resolve(server));
  });
};

// Only start when run directly
if (process.env.NODE_ENV !== 'test') {
  startServer().then(() => {
    if (process.env.ENABLE_CRONS !== 'false') {
      startCronJobs();
    }
    // eslint-disable-next-line no-console
    console.log(`Backend running on http://0.0.0.0:${PORT}`);
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Failed to start server', err);
    process.exit(1);
  });
}

export default app;


