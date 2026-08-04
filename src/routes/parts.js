import { Router } from 'express';
import { createPart } from '../controllers/partsController.js';

const router = Router();

router.post('/', createPart);

export default router;
