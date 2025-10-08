import { Router } from 'express';
import { createMedicine, listMedicines, deleteMedicine, updateMedicine } from '../controllers/medicineController.js';

const router = Router();

router.post('/', createMedicine);
router.get('/', listMedicines);
router.delete('/:id', deleteMedicine);
router.put('/:id', updateMedicine);

export default router;


