import { Router } from 'express';
import {
  trackEvent,
  getFileAnalytics,
  getCreatorAnalytics,
  getDashboardStats,
  getTopFiles
} from '@/controllers/analyticsController';
import { authenticate } from '@/middleware/auth';
import {
  mongoIdValidation,
  analyticsValidation
} from '@/middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Analytics tracking and retrieval
router.post('/track', trackEvent);
router.get('/dashboard', analyticsValidation, getDashboardStats);
router.get('/creator', analyticsValidation, getCreatorAnalytics);
router.get('/top-files', analyticsValidation, getTopFiles);
router.get('/file/:fileId', mongoIdValidation, analyticsValidation, getFileAnalytics);

export default router;
