import { Router } from 'express';
import {
  listSuppliers,
  createSupplier,
  getSupplierImpact,
  getPartDependencyPaths,
} from '../controllers/suppliersController.js';

const router = Router();

router.get('/', listSuppliers);
router.post('/', createSupplier);
router.get('/paths/parts', getPartDependencyPaths);
router.get('/:id/impact', getSupplierImpact);

export default router;
