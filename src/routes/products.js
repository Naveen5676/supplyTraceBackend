import { Router } from 'express';
import {
  listProducts,
  createProduct,
  getProduct,
} from '../controllers/productsController.js';

const router = Router();

router.get('/', listProducts);
router.post('/', createProduct);
router.get('/:id', getProduct);

export default router;
