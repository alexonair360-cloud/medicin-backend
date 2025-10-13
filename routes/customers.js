import { Router } from 'express';
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from '../controllers/customers.js';

const router = Router();

// GET /api/customers?q=<query>
router.get('/', listCustomers);

// POST /api/customers
router.post('/', createCustomer);

// PUT /api/customers/:id
router.put('/:id', updateCustomer);

// DELETE /api/customers/:id
router.delete('/:id', deleteCustomer);

export default router;
