import { Router } from 'express';
import {
  getMerchants,
  updateMerchant,
  deleteMerchant,
  adminResetPassword,
} from '../controllers/admin.controller';
import { protect, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Only allow super_admin and admin
router.use(protect, requireRole('super_admin', 'admin'));

// /api/admin/users
router.get('/users', getMerchants);
router.patch('/users/:id', updateMerchant);
router.delete('/users/:id', deleteMerchant);
router.post('/users/:id/reset-password', adminResetPassword);

export default router;
