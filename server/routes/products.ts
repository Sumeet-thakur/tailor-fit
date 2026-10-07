import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protectAdmin, requireSuperAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

router.route('/').get(getProducts).post(protectAdmin, createProduct);
router.route('/:id').get(getProduct).put(protectAdmin, updateProduct).delete(protectAdmin, requireSuperAdmin, deleteProduct);

export default router;
