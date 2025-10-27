import { Router } from 'express';
import {
  createPaymentOrder,
  getUserPayments,
  getCreatorEarnings,
  getPaymentById,
  paymentWebhook,
  getPaymentStats,
  verifyPaymentStatus,
  testCashfreeAuth
} from '@/controllers/paymentController';
import { authenticate } from '@/middleware/auth';
import {
  createPaymentValidation,
  mongoIdValidation,
  paginationValidation,
  analyticsValidation
} from '@/middleware/validation';

const router = Router();

// Webhook route (no authentication required)
router.post('/webhook', paymentWebhook);

// Test authentication endpoint (no auth required for testing)
router.get('/test-auth', testCashfreeAuth);

// Protected routes
router.use(authenticate); // All routes below require authentication

// Payment creation and management
router.post('/create-order', createPaymentValidation, createPaymentOrder);
router.get('/user', paginationValidation, getUserPayments);
router.get('/earnings', paginationValidation, getCreatorEarnings);
router.get('/stats', analyticsValidation, getPaymentStats);
router.get('/verify/:orderId', verifyPaymentStatus);
router.get('/:id', mongoIdValidation, getPaymentById);

export default router;
