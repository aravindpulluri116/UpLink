import { Router } from 'express';
import {
  uploadFile,
  getUserFiles,
  getPublicFiles,
  getFileById,
  updateFile,
  deleteFile,
  getDownloadUrl,
  getPreviewUrl,
  getEmbeddedPreview,
  generateShareablePreview,
  getPublicPreview
} from '@/controllers/fileController';
import { authenticate, optionalAuth } from '@/middleware/auth';
import { uploadSingle } from '@/middleware/upload';
import {
  fileUploadValidation,
  updateFileValidation,
  mongoIdValidation,
  paginationValidation,
  searchValidation
} from '@/middleware/validation';

const router = Router();

// Public routes
router.get('/public', paginationValidation, searchValidation, getPublicFiles);
router.get('/:id', mongoIdValidation, optionalAuth, getFileById);

// Protected routes
router.use(authenticate); // All routes below require authentication

// File upload
router.post('/upload', uploadSingle('file'), fileUploadValidation, uploadFile);

// User's files
router.get('/', paginationValidation, getUserFiles);

// File management
router.put('/:id', mongoIdValidation, updateFileValidation, updateFile);
router.delete('/:id', mongoIdValidation, deleteFile);

// Download and Preview
router.get('/:id/download', mongoIdValidation, getDownloadUrl);
router.get('/:id/preview', mongoIdValidation, getPreviewUrl);
router.get('/:id/embed', mongoIdValidation, getEmbeddedPreview);
router.get('/:id/share', mongoIdValidation, generateShareablePreview);

// Public preview (no auth required)
router.get('/:id/public-preview', mongoIdValidation, getPublicPreview);

export default router;
