import multer from 'multer';
import { Request } from 'express';
import { UPLOAD_CONFIG } from '@/config/aws';
import { logger } from '@/utils/logger';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Get file extension
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExtension) {
      return cb(new Error('File must have an extension'));
    }

    // Check if file type is allowed
    if (!UPLOAD_CONFIG.allowedTypes.includes(fileExtension)) {
      return cb(new Error(`File type .${fileExtension} is not allowed. Allowed types: ${UPLOAD_CONFIG.allowedTypes.join(', ')}`));
    }

    // Check file size
    if (file.size && file.size > UPLOAD_CONFIG.maxFileSize) {
      return cb(new Error(`File size exceeds maximum limit of ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`));
    }

    cb(null, true);
  } catch (error) {
    logger.error('File filter error:', error);
    cb(error as Error);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.maxFileSize,
    files: 5 // Maximum 5 files per request
  }
});

// Middleware for single file upload
export const uploadSingle = (fieldName: string = 'file') => {
  return (req: Request, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for multiple files upload
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 5) => {
  return (req: Request, res: any, next: any) => {
    upload.array(fieldName, maxCount)(req, res, (err) => {
      if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Middleware for specific field uploads
export const uploadFields = (fields: multer.Field[]) => {
  return (req: Request, res: any, next: any) => {
    upload.fields(fields)(req, res, (err) => {
      if (err) {
        logger.error('Upload error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      next();
    });
  };
};

// Helper function to get file type from extension
export const getFileType = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  if (!extension) return 'document';
  
  if (UPLOAD_CONFIG.imageTypes.includes(extension)) return 'image';
  if (UPLOAD_CONFIG.videoTypes.includes(extension)) return 'video';
  if (UPLOAD_CONFIG.audioTypes.includes(extension)) return 'audio';
  if (UPLOAD_CONFIG.documentTypes.includes(extension)) return 'document';
  if (UPLOAD_CONFIG.model3dTypes.includes(extension)) return '3d';
  
  return 'document';
};

// Helper function to validate file
export const validateFile = (file: Express.Multer.File): { isValid: boolean; error?: string } => {
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }

  if (!file.buffer || file.buffer.length === 0) {
    return { isValid: false, error: 'File is empty' };
  }

  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    return { isValid: false, error: `File size exceeds maximum limit of ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB` };
  }

  const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
  if (!fileExtension || !UPLOAD_CONFIG.allowedTypes.includes(fileExtension)) {
    return { isValid: false, error: `File type .${fileExtension} is not allowed` };
  }

  return { isValid: true };
};
