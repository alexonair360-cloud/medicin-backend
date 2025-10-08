import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import Invoice from '../models/Invoice.js';

const router = Router();

router.get('/:invoiceId/download', async (req, res, next) => {
  try {
    const inv = await Invoice.findById(req.params.invoiceId).lean();
    if (!inv || !inv.pdfPath || !fs.existsSync(inv.pdfPath)) return res.status(404).json({ message: 'PDF not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(inv.pdfPath)}`);
    fs.createReadStream(inv.pdfPath).pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;


