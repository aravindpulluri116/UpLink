import { Router } from 'express';
import {
  getUserProfile,
  getUserPublicFiles,
  searchUsers,
  getUserStats
} from '@/controllers/userController';
import { authenticate, optionalAuth } from '@/middleware/auth';
import {
  mongoIdValidation,
  paginationValidation
} from '@/middleware/validation';

const router = Router();

// Public routes
router.get('/search', paginationValidation, searchUsers);
router.get('/:id', mongoIdValidation, optionalAuth, getUserProfile);
router.get('/:id/files', mongoIdValidation, paginationValidation, getUserPublicFiles);
router.get('/:id/stats', mongoIdValidation, getUserStats);

// Protected routes
router.use(authenticate); // All routes below require authentication

// Additional protected user routes can be added here

export default router;
