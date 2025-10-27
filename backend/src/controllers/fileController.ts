import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { File, User } from '@/models';
import { ApiResponse, AuthRequest } from '@/types';
import { 
  uploadToR2, 
  generateS3Key, 
  generatePresignedDownloadUrl,
  deleteFromR2,
  testR2Connection,
  R2_CONFIGURED
} from '@/config/aws';
import { WatermarkService } from '@/services/watermarkService';
import { validateFile, getFileType } from '@/middleware/upload';
import { logger } from '@/utils/logger';


// Upload file
export const uploadFile = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array()
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file provided'
      });
      return;
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        message: validation.error || 'Validation failed'
      });
      return;
    }

    const { description, price, tags, isPublic } = req.body;
    const user = req.user!;

    // Generate unique filename and S3 key
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.originalname.split('.').pop();
    const fileName = `${timestamp}_${randomString}.${extension}`;
    const s3Key = generateS3Key(fileName, 'files');

    // Upload original file to R2
    const uploadResult = await uploadToR2(s3Key, file.buffer, file.mimetype);

    // Process file for watermarking
    const fileType = getFileType(file.originalname);
    const watermarkText = `UPLINK PREVIEW`;
    
    logger.info(`Processing file: ${file.originalname}, Type: ${fileType}, MIME: ${file.mimetype}`);
    
    let watermarkedS3Key: string | undefined;
    let previewS3Key: string | undefined;
    let watermarkedUrl: string | undefined;
    let previewUrl: string | undefined;

    try {
      const processed = await WatermarkService.processFile(
        file.buffer,
        fileName,
        fileType,
        watermarkText,
        user.name
      );

      logger.info(`Watermarking processed - Preview buffer: ${processed.previewBuffer ? 'exists' : 'missing'}, Preview S3 key: ${processed.previewS3Key || 'missing'}`);

      // Upload watermarked files
      const watermarkedResult = await WatermarkService.uploadProcessedFiles(
        processed.watermarkedBuffer,
        processed.previewBuffer,
        processed.s3Key,
        processed.previewS3Key,
        file.mimetype
      );

      watermarkedS3Key = processed.s3Key;
      previewS3Key = processed.previewS3Key;
      watermarkedUrl = watermarkedResult.watermarkedUrl;
      previewUrl = watermarkedResult.previewUrl;

      logger.info(`Watermarking completed - Preview URL: ${previewUrl || 'missing'}`);
    } catch (watermarkError) {
      logger.error('Watermarking failed, proceeding without watermark:', watermarkError);
      // Continue without watermark if watermarking fails
    }

    // Create file record in database
    const fileRecord = new File({
      creatorId: user._id.toString(),
      originalName: file.originalname,
      fileName,
      fileType,
      mimeType: file.mimetype,
      size: file.size,
      s3Key,
      s3Url: uploadResult.Location,
      watermarkS3Key: watermarkedS3Key,
      watermarkS3Url: watermarkedUrl,
      previewS3Key,
      previewS3Url: previewUrl,
      status: 'ready',
      isPublic: isPublic === 'true' || isPublic === true,
      price: price ? parseFloat(price) : 0,
      description,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map((tag: string) => tag.trim())) : []
    });

    await fileRecord.save();

    logger.info(`File uploaded successfully: ${file.originalname} by ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file: {
          id: fileRecord._id,
          originalName: fileRecord.originalName,
          fileName: fileRecord.fileName,
          fileType: fileRecord.fileType,
          size: fileRecord.size,
          status: fileRecord.status,
          isPublic: fileRecord.isPublic,
          price: fileRecord.price,
          description: fileRecord.description,
          tags: fileRecord.tags,
          createdAt: fileRecord.createdAt
        }
      }
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'File upload failed'
    });
  }
};

// Get user's files
export const getUserFiles = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const user = req.user!;
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    // Test R2 connection
    const r2Working = await testR2Connection();
    if (!r2Working) {
      logger.error('R2 connection failed - this will cause issues with file access');
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions: any = {};
    
    const sortStr = Array.isArray(sort) ? sort[0] : sort;
    if (typeof sortStr === 'string' && sortStr.startsWith('-')) {
      sortOptions[sortStr.substring(1)] = -1;
    } else if (typeof sortStr === 'string') {
      sortOptions[sortStr] = 1;
    }

    const files = await File.find({ creatorId: user._id.toString() })
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));
      // Include all fields for presigned URL generation

    // Generate presigned URLs for each file
    const filesWithUrls = await Promise.all(files.map(async (file) => {
      try {
        // Generate presigned URL for the file (valid for 1 hour)
        let presignedUrl = file.s3Url; // Fallback to original URL
        if (file.s3Key && file.s3Key.trim() !== '') {
          try {
            presignedUrl = await generatePresignedDownloadUrl(file.s3Key, 3600);
            logger.info(`✅ Generated presigned download URL for file ${file._id}`);
          } catch (urlError) {
            logger.warn(`❌ Error generating presigned URL for file ${file._id}:`, urlError);
            presignedUrl = file.s3Url; // Use original URL as fallback
          }
        }
        
        // Generate presigned URL for preview if it exists
        let presignedPreviewUrl = null;
        logger.info(`File ${file._id} (${file.originalName}) - Preview S3 Key: ${file.previewS3Key || 'missing'}, Preview S3 URL: ${file.previewS3Url || 'missing'}, Watermark S3 URL: ${file.watermarkS3Url || 'missing'}`);
        
        if (file.previewS3Key && file.previewS3Key.trim() !== '') {
          try {
            // Generate short-lived signed URL for preview (5 minutes)
            presignedPreviewUrl = await generatePresignedDownloadUrl(file.previewS3Key, 300);
            logger.info(`✅ Generated presigned preview URL for file ${file._id}: ${presignedPreviewUrl}`);
          } catch (previewError) {
            logger.warn(`❌ Error generating presigned preview URL for file ${file._id}:`, previewError);
            // Fallback to watermarked URL if preview fails
            if (file.watermarkS3Key && file.watermarkS3Key.trim() !== '') {
              try {
                presignedPreviewUrl = await generatePresignedDownloadUrl(file.watermarkS3Key, 300);
                logger.info(`Using watermarked URL as preview for file ${file._id}: ${presignedPreviewUrl}`);
              } catch (watermarkError) {
                logger.warn(`❌ Error generating watermarked preview URL for file ${file._id}:`, watermarkError);
                presignedPreviewUrl = null;
              }
            } else {
              presignedPreviewUrl = null;
            }
          }
        } else if (file.watermarkS3Key && file.watermarkS3Key.trim() !== '') {
          // Use watermarked file as preview if no dedicated preview
          try {
            presignedPreviewUrl = await generatePresignedDownloadUrl(file.watermarkS3Key, 300);
            logger.info(`Using watermarked URL as preview for file ${file._id}: ${presignedPreviewUrl}`);
          } catch (watermarkError) {
            logger.warn(`❌ Error generating watermarked preview URL for file ${file._id}:`, watermarkError);
            presignedPreviewUrl = null;
          }
        } else {
          logger.warn(`❌ No preview URL available for file ${file._id} (${file.originalName})`);
        }
        
        // Clean up the response to exclude sensitive keys
        const fileObj = file.toObject();
        const { s3Key, watermarkS3Key, previewS3Key, ...cleanFileObj } = fileObj;
        
        return {
          ...cleanFileObj,
          downloadUrl: presignedUrl,
          previewUrl: presignedPreviewUrl || file.previewS3Url || file.watermarkS3Url || null,
          isPreviewOnly: true, // Indicates this is a preview, not downloadable
          requiresPayment: true // Indicates payment is required for full access
        };
      } catch (error) {
        logger.error(`Error generating presigned URL for file ${file._id}:`, error);
        const fileObj = file.toObject();
        const { s3Key, watermarkS3Key, previewS3Key, ...cleanFileObj } = fileObj;
        
        // Try to generate signed URLs for fallback
        let fallbackDownloadUrl = file.s3Url;
        let fallbackPreviewUrl = null;
        
        if (file.s3Key && file.s3Key.trim() !== '') {
          try {
            fallbackDownloadUrl = await generatePresignedDownloadUrl(file.s3Key, 3600);
          } catch (error) {
            logger.warn(`Error generating fallback download URL: ${error}`);
          }
        }
        
        if (file.watermarkS3Key && file.watermarkS3Key.trim() !== '') {
          try {
            fallbackPreviewUrl = await generatePresignedDownloadUrl(file.watermarkS3Key, 300);
          } catch (error) {
            logger.warn(`Error generating fallback preview URL: ${error}`);
          }
        }
        
        return {
          ...cleanFileObj,
          downloadUrl: fallbackDownloadUrl,
          previewUrl: fallbackPreviewUrl
        };
      }
    }));

    const total = await File.countDocuments({ creatorId: user._id.toString() });

    res.json({
      success: true,
      message: 'Files retrieved successfully',
      data: { files: filesWithUrls },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get user files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve files'
    });
  }
};

// Get public files
export const getPublicFiles = async (req: Request, res: Response<ApiResponse>) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', q, type, minPrice, maxPrice } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions: any = {};
    
    const sortStr = Array.isArray(sort) ? sort[0] : sort;
    if (typeof sortStr === 'string' && sortStr.startsWith('-')) {
      sortOptions[sortStr.substring(1)] = -1;
    } else if (typeof sortStr === 'string') {
      sortOptions[sortStr] = 1;
    }

    // Build query
    const query: any = { isPublic: true, status: 'ready' };

    if (type) {
      query.fileType = type;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      query.$or = [
        { originalName: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    const files = await File.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .select('-s3Key -watermarkS3Key -previewS3Key')
      .populate('creatorId', 'name email');

    const total = await File.countDocuments(query);

    res.json({
      success: true,
      message: 'Public files retrieved successfully',
      data: { files },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get public files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve public files'
    });
  }
};

// Get file by ID
export const getFileById = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const user = (req as AuthRequest).user;

    const file = await File.findById(id).populate('creatorId', 'name email');
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Check if user can access this file
    if (!file.isPublic && (!user || file.creatorId.toString() !== user._id.toString())) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      message: 'File retrieved successfully',
      data: { file }
    });
  } catch (error) {
    logger.error('Get file by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve file'
    });
  }
};

// Update file
export const updateFile = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array()
      });
      return;
    }

    const { id } = req.params;
    const user = req.user!;
    const { description, price, tags, isPublic } = req.body;

    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Check ownership
    if (file.creatorId.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Update file
    if (description !== undefined) file.description = description;
    if (price !== undefined) file.price = parseFloat(price);
    if (tags !== undefined) {
      file.tags = Array.isArray(tags) ? tags : tags.split(',').map((tag: string) => tag.trim());
    }
    if (isPublic !== undefined) file.isPublic = isPublic === 'true' || isPublic === true;

    await file.save();

    res.json({
      success: true,
      message: 'File updated successfully',
      data: { file }
    });
  } catch (error) {
    logger.error('Update file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update file'
    });
  }
};

// Delete file
export const deleteFile = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Check ownership
    if (file.creatorId.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    // Delete from R2
    try {
      await deleteFromR2(file.s3Key);
      if (file.watermarkS3Key) await deleteFromR2(file.watermarkS3Key);
      if (file.previewS3Key) await deleteFromR2(file.previewS3Key);
    } catch (r2Error) {
      logger.error('Error deleting from R2:', r2Error);
      // Continue with database deletion even if R2 deletion fails
    }

    // Delete from database
    await file.deleteOne();

    logger.info(`File deleted: ${file.originalName} by ${user.email}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    });
  }
};

// Get download URL (requires payment for paid files)
export const getDownloadUrl = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Check if user is the creator (creators can always download their own files)
    const isCreator = file.creatorId.toString() === user._id.toString();
    
    if (isCreator) {
      // Creator can download without payment
      const downloadUrl = await generatePresignedDownloadUrl(file.s3Key, 3600); // 1 hour
      
      res.json({
        success: true,
        message: 'Download URL generated successfully',
        data: { downloadUrl }
      });
      return;
    }

    // For non-creators, check if file is paid and if they have paid
    if (file.isPublic && file.price && file.price > 0) {
      // File requires payment - check if user has completed payment
      const { Payment } = await import('@/models');
      const completedPayment = await Payment.findOne({
        fileId: file._id.toString(),
        clientId: user._id.toString(),
        status: 'completed'
      });

      if (!completedPayment) {
        res.status(402).json({
          success: false,
          message: 'Payment required to download this file',
          data: {
            requiresPayment: true,
            price: file.price,
            currency: file.currency || 'INR'
          }
        });
        return;
      }

      logger.info(`✅ Payment verified for user ${user._id} to download file ${file._id}`);
    }

    // Check if file is public (for non-paid files)
    if (!file.isPublic && !isCreator) {
      res.status(403).json({
        success: false,
        message: 'This file is private'
      });
      return;
    }

    // Generate presigned download URL
    const downloadUrl = await generatePresignedDownloadUrl(file.s3Key, 3600); // 1 hour

    res.json({
      success: true,
      message: 'Download URL generated successfully',
      data: { downloadUrl }
    });
  } catch (error) {
    logger.error('Get download URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate download URL'
    });
  }
};

// Get embedded preview URL (non-downloadable, for display only)
export const getEmbeddedPreview = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Check if user can access this file
    if (!file.isPublic && file.creatorId.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    let previewUrl = null;
    
    // Use original file for preview (watermark is applied via CSS overlay)
    if (file.s3Key && file.s3Key.trim() !== '') {
      try {
        previewUrl = await generatePresignedDownloadUrl(file.s3Key, 300); // 5 minutes
        logger.info(`Generated embedded preview URL for file ${file._id}`);
      } catch (previewError) {
        logger.warn(`Error generating embedded preview URL for file ${file._id}:`, previewError);
      }
    }

    if (!previewUrl) {
      res.status(404).json({
        success: false,
        message: 'No preview available for this file'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Embedded preview URL generated successfully',
      data: { 
        previewUrl,
        isEmbedded: true, // Indicates this is for embedded display only
        isDownloadable: false, // Explicitly not downloadable
        requiresPayment: true, // Payment required for full access
        expiresIn: 300, // 5 minutes
        expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
        fileInfo: {
          id: file._id,
          name: file.originalName,
          type: file.fileType,
          size: file.size,
          price: file.price,
          creator: file.creatorId
        }
      }
    });
  } catch (error) {
    logger.error('Get embedded preview URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate embedded preview URL'
    });
  }
};

// Generate shareable preview link for clients (public access)
export const generateShareablePreview = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Only file creator can generate shareable links
    if (file.creatorId.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Only file creator can generate shareable links'
      });
      return;
    }

    // Generate a shareable token (you could use JWT or crypto for this)
    const shareableToken = Buffer.from(`${file._id}-${Date.now()}`).toString('base64');
    
    // Store the shareable token in the file record (you might want to add this field to your schema)
    // For now, we'll generate the preview URL directly
    
    let previewUrl = null;
    
    // Use original file for preview (watermark is applied via CSS overlay)
    if (file.s3Key && file.s3Key.trim() !== '') {
      try {
        previewUrl = await generatePresignedDownloadUrl(file.s3Key, 3600); // 1 hour for shareable links
        logger.info(`Generated shareable preview URL for file ${file._id}`);
      } catch (previewError) {
        logger.warn(`Error generating shareable preview URL for file ${file._id}:`, previewError);
      }
    }

    if (!previewUrl) {
      res.status(404).json({
        success: false,
        message: 'No preview available for this file'
      });
      return;
    }

    // Generate the shareable link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const shareableLink = `${baseUrl}/preview/${file._id}?token=${shareableToken}`;

    res.json({
      success: true,
      message: 'Shareable preview link generated successfully',
      data: { 
        shareableLink,
        previewUrl,
        token: shareableToken,
        expiresIn: 3600, // 1 hour
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        fileInfo: {
          id: file._id,
          name: file.originalName,
          type: file.fileType,
          size: file.size,
          price: file.price,
          creator: file.creatorId
        }
      }
    });
  } catch (error) {
    logger.error('Generate shareable preview link error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate shareable preview link'
    });
  }
};

// Get public preview (for shareable links)
export const getPublicPreview = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token required for preview access'
      });
      return;
    }

    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Verify token (basic verification - you might want to enhance this)
    // For now, we'll accept any token for testing purposes
    // In production, you should implement proper JWT token verification
    if (!token || typeof token !== 'string' || token.length < 10) {
      res.status(403).json({
        success: false,
        message: 'Invalid preview token'
      });
      return;
    }

    let previewUrl = null;
    
    // Use original file for preview (watermark is applied via CSS overlay)
    if (file.s3Key && file.s3Key.trim() !== '') {
      try {
        previewUrl = await generatePresignedDownloadUrl(file.s3Key, 300); // 5 minutes
        logger.info(`Generated public preview URL for file ${file._id}`);
      } catch (previewError) {
        logger.warn(`Error generating public preview URL for file ${file._id}:`, previewError);
      }
    }

    if (!previewUrl) {
      res.status(404).json({
        success: false,
        message: 'No preview available for this file'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Public preview URL generated successfully',
      data: { 
        previewUrl,
        isEmbedded: true,
        isDownloadable: false,
        requiresPayment: (file.price || 0) > 0,
        expiresIn: 300, // 5 minutes
        expiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
        fileInfo: {
          id: file._id,
          name: file.originalName,
          type: file.fileType,
          size: file.size,
          price: file.price
        }
      }
    });
  } catch (error) {
    logger.error('Get public preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate public preview'
    });
  }
};

// Get preview URL (short-lived for security)
export const getPreviewUrl = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const file = await File.findById(id);
    
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Check if user can access this file
    if (!file.isPublic && file.creatorId.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    let previewUrl = null;
    
    // Try to generate preview URL from dedicated preview file
    if (file.previewS3Key && file.previewS3Key.trim() !== '') {
      try {
        previewUrl = await generatePresignedDownloadUrl(file.previewS3Key, 300); // 5 minutes
        logger.info(`Generated preview URL for file ${file._id}`);
      } catch (previewError) {
        logger.warn(`Error generating preview URL for file ${file._id}:`, previewError);
      }
    }
    
    // Fallback to watermarked file if no dedicated preview
    if (!previewUrl && file.watermarkS3Key && file.watermarkS3Key.trim() !== '') {
      try {
        previewUrl = await generatePresignedDownloadUrl(file.watermarkS3Key, 300); // 5 minutes
        logger.info(`Generated watermarked preview URL for file ${file._id}`);
      } catch (watermarkError) {
        logger.warn(`Error generating watermarked preview URL for file ${file._id}:`, watermarkError);
      }
    }

    if (!previewUrl) {
      res.status(404).json({
        success: false,
        message: 'No preview available for this file'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Preview URL generated successfully',
      data: { 
        previewUrl,
        expiresIn: 300, // 5 minutes
        expiresAt: new Date(Date.now() + 300 * 1000).toISOString()
      }
    });
  } catch (error) {
    logger.error('Get preview URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate preview URL'
    });
  }
};
