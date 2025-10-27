import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@/utils/logger';

// Configure AWS SDK for Cloudflare R2
// Based on Cloudflare R2 documentation: https://developers.cloudflare.com/r2/api/s3/tokens/
const r2Credentials = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  region: 'auto' // R2 uses 'auto' region
};

// Validate credentials
if (!r2Credentials.accessKeyId || !r2Credentials.secretAccessKey || !process.env.R2_ENDPOINT) {
  logger.error('❌ R2 credentials not found in environment variables!');
  logger.error('Please set the following environment variables:');
  logger.error('- R2_ACCESS_KEY_ID');
  logger.error('- R2_SECRET_ACCESS_KEY');
  logger.error('- R2_BUCKET_NAME');
  logger.error('- R2_ENDPOINT');
  logger.error('');
  logger.error('Create a .env file in the backend directory with your R2 credentials.');
  process.exit(1);
} else {
  logger.info('✅ R2 credentials found - attempting connection');
}

// Export a flag to indicate if R2 is configured
export const R2_CONFIGURED = !!(r2Credentials.accessKeyId && r2Credentials.secretAccessKey);

// Create S3-compatible client for Cloudflare R2 using AWS SDK v3
export const s3Client = new S3Client({
  region: 'auto', // R2 uses 'auto' region
  endpoint: process.env.R2_ENDPOINT || '',
  forcePathStyle: true, // Required for R2
  credentials: {
    accessKeyId: r2Credentials.accessKeyId || '',
    secretAccessKey: r2Credentials.secretAccessKey || ''
  },
  maxAttempts: 3, // Retry failed requests
});

// R2 bucket configuration
export const S3_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'uplink';
export const S3_BUCKET_URL = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;

// File upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB default
  allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'mp4,avi,mov,mkv,mp3,wav,png,jpg,jpeg,gif,pdf,doc,docx,blend,obj,fbx').split(','),
  imageTypes: ['png', 'jpg', 'jpeg', 'gif'],
  videoTypes: ['mp4', 'avi', 'mov', 'mkv'],
  audioTypes: ['mp3', 'wav'],
  documentTypes: ['pdf', 'doc', 'docx'],
  model3dTypes: ['blend', 'obj', 'fbx']
};

// Generate S3 key for file
export const generateS3Key = (fileName: string, folder: string = 'files'): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = fileName.split('.').pop();
  return `${folder}/${timestamp}_${randomString}.${extension}`;
};

// Generate presigned URL for upload
export const generatePresignedUploadUrl = async (
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('Error generating presigned upload URL:', error);
    throw error;
  }
};

// Generate presigned URL for download
export const generatePresignedDownloadUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('Error generating presigned download URL:', error);
    throw error;
  }
};

// Upload file to R2 using AWS SDK v3
export const uploadToR2 = async (
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ Location: string; Key: string; Bucket: string }> => {
  // Check if credentials are available
  if (!r2Credentials.accessKeyId || !r2Credentials.secretAccessKey) {
    const error = new Error('R2 credentials not configured');
    (error as any).code = 'CredentialsError';
    throw error;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: {
        'uploaded-by': 'uplink-platform',
        'upload-timestamp': new Date().toISOString()
      },
      CacheControl: 'public, max-age=31536000' // 1 year cache
    });

    const result = await s3Client.send(command);
    
    // Construct the location URL
    const location = `${process.env.R2_ENDPOINT}/${S3_BUCKET_NAME}/${key}`;
    
    logger.info(`File uploaded to R2: ${key} at ${location}`);
    
    return {
      Location: location,
      Key: key,
      Bucket: S3_BUCKET_NAME
    };
  } catch (error) {
    logger.error('Error uploading to R2:', error);
    throw error;
  }
};

// Legacy alias for backward compatibility
export const uploadToS3 = uploadToR2;

// Delete file from R2
export const deleteFromR2 = async (key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    logger.info(`File deleted from R2: ${key}`);
  } catch (error) {
    logger.error('Error deleting from R2:', error);
    throw error;
  }
};

// Legacy alias for backward compatibility
export const deleteFromS3 = deleteFromR2;

// Check if file exists in R2
export const fileExistsInR2 = async (key: string): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
};

// Legacy alias for backward compatibility
export const fileExistsInS3 = fileExistsInR2;

// Get file metadata from R2
export const getFileMetadata = async (key: string) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });

    const result = await s3Client.send(command);
    return result;
  } catch (error) {
    logger.error('Error getting file metadata from R2:', error);
    throw error;
  }
};

// Test R2 connection using AWS SDK v3
export const testR2Connection = async (): Promise<boolean> => {
  try {
    // Check credentials first
    if (!r2Credentials.accessKeyId || !r2Credentials.secretAccessKey) {
      logger.warn('R2 credentials not configured - skipping connection test');
      return false;
    }

    // Test basic bucket access
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      MaxKeys: 1
    });

    const result = await s3Client.send(command);
    logger.info('Cloudflare R2 connection test successful');
    logger.info(`Bucket contains ${result.KeyCount || 0} objects`);
    
    return true;
  } catch (error) {
    logger.error('Cloudflare R2 connection test failed:', error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('InvalidAccessKeyId')) {
        logger.error('R2 Access Key ID is invalid');
      } else if (error.message.includes('SignatureDoesNotMatch')) {
        logger.error('R2 Secret Access Key is invalid');
      } else if (error.message.includes('NoSuchBucket')) {
        logger.error(`R2 Bucket '${S3_BUCKET_NAME}' does not exist`);
      } else if (error.message.includes('AccessDenied')) {
        logger.error('R2 Access denied - check bucket permissions');
      } else if (error.message.includes('CredentialsError')) {
        logger.error('R2 credentials not properly configured');
      }
    }
    
    return false;
  }
};

// Legacy alias for backward compatibility
export const testS3Connection = testR2Connection;
