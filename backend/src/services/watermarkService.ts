import sharp from 'sharp';
// @ts-ignore - fluent-ffmpeg doesn't have types
import ffmpeg from 'fluent-ffmpeg';
import { uploadToR2, generateS3Key, UPLOAD_CONFIG, R2_CONFIGURED } from '@/config/aws';
import { logger } from '@/utils/logger';
import { WatermarkOptions } from '@/types';

export class WatermarkService {
  // Generate watermarked image
  static async generateImageWatermark(
    imageBuffer: Buffer,
    watermarkText: string,
    options: WatermarkOptions = {
      text: watermarkText,
      position: 'bottom-right',
      opacity: 0.7,
      fontSize: 24,
      color: 'white'
    }
  ): Promise<Buffer> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }

      // Calculate text position
      const textWidth = options.text.length * (options.fontSize * 0.6);
      const textHeight = options.fontSize * 1.2;
      
      let x = 0;
      let y = 0;
      
      switch (options.position) {
        case 'top-left':
          x = 20;
          y = 20;
          break;
        case 'top-right':
          x = metadata.width - textWidth - 20;
          y = 20;
          break;
        case 'bottom-left':
          x = 20;
          y = metadata.height - textHeight - 20;
          break;
        case 'bottom-right':
          x = metadata.width - textWidth - 20;
          y = metadata.height - textHeight - 20;
          break;
        case 'center':
          x = (metadata.width - textWidth) / 2;
          y = (metadata.height - textHeight) / 2;
          break;
      }

      // Create watermark overlay
      const watermarkSvg = `
        <svg width="${metadata.width}" height="${metadata.height}">
          <text x="${x}" y="${y}" 
                font-family="Arial, sans-serif" 
                font-size="${options.fontSize}" 
                fill="${options.color}" 
                opacity="${options.opacity}"
                font-weight="bold">
            ${options.text}
          </text>
        </svg>
      `;

      const watermarkedImage = await image
        .composite([{
          input: Buffer.from(watermarkSvg),
          top: 0,
          left: 0
        }])
        .png()
        .toBuffer();

      return watermarkedImage;
    } catch (error) {
      logger.error('Error generating image watermark:', error);
      throw error;
    }
  }

  // Generate watermarked video
  static async generateVideoWatermark(
    videoBuffer: Buffer,
    watermarkText: string,
    options: WatermarkOptions = {
      text: watermarkText,
      position: 'bottom-right',
      opacity: 0.7,
      fontSize: 24,
      color: 'white'
    }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const outputBuffer: Buffer[] = [];
        
        // Calculate position based on video dimensions
        let x = 0;
        let y = 0;
        
        ffmpeg()
          .input(videoBuffer)
          .videoFilters([
            {
              filter: 'drawtext',
              options: {
                text: options.text,
                fontfile: 'Arial',
                fontsize: options.fontSize,
                fontcolor: options.color,
                alpha: options.opacity,
                x: this.getVideoPositionX(options.position, x),
                y: this.getVideoPositionY(options.position, y)
              }
            }
          ])
          .format('mp4')
          .on('error', (err: any) => {
            logger.error('Error generating video watermark:', err);
            reject(err);
          })
          .on('end', () => {
            resolve(Buffer.concat(outputBuffer));
          })
          .on('data', (chunk: any) => {
            outputBuffer.push(chunk);
          })
          .pipe();
      } catch (error) {
        logger.error('Error generating video watermark:', error);
        reject(error);
      }
    });
  }

  // Generate preview image (compressed version for images)
  static async generateImagePreview(
    imageBuffer: Buffer
  ): Promise<Buffer> {
    try {
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }

      // Create a smaller, compressed preview (max 800px width, 80% quality)
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / metadata.width);
      const newWidth = Math.floor(metadata.width * scale);
      const newHeight = Math.floor(metadata.height * scale);

      const previewBuffer = await image
        .resize(newWidth, newHeight, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      return previewBuffer;
    } catch (error) {
      logger.error('Error generating image preview:', error);
      throw error;
    }
  }

  // Generate preview image from video
  static async generateVideoPreview(
    videoBuffer: Buffer,
    timestamp: number = 5
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const outputBuffer: Buffer[] = [];
        
        ffmpeg()
          .input(videoBuffer)
          .seekInput(timestamp)
          .frames(1)
          .format('png')
          .on('error', (err: any) => {
            logger.error('Error generating video preview:', err);
            reject(err);
          })
          .on('end', () => {
            resolve(Buffer.concat(outputBuffer));
          })
          .on('data', (chunk: any) => {
            outputBuffer.push(chunk);
          })
          .pipe();
      } catch (error) {
        logger.error('Error generating video preview:', error);
        reject(error);
      }
    });
  }

  // Process file and generate watermarked version
  static async processFile(
    fileBuffer: Buffer,
    fileName: string,
    fileType: string,
    watermarkText: string,
    creatorName: string
  ): Promise<{
    watermarkedBuffer: Buffer;
    previewBuffer?: Buffer;
    s3Key: string;
    previewS3Key?: string;
  }> {
    try {
      const timestamp = new Date().toISOString();
      const watermarkOptions: WatermarkOptions = {
        text: `${watermarkText} | ${creatorName} | ${timestamp}`,
        position: 'bottom-right',
        opacity: 0.7,
        fontSize: 24,
        color: 'white'
      };

      let watermarkedBuffer: Buffer;
      let previewBuffer: Buffer | undefined;

      if (UPLOAD_CONFIG.imageTypes.includes(fileType)) {
        logger.info(`Processing image file: ${fileName}`);
        // Process image
        watermarkedBuffer = await this.generateImageWatermark(
          fileBuffer,
          watermarkText,
          watermarkOptions
        );
        // For images, create a separate preview (smaller/compressed version)
        previewBuffer = await this.generateImagePreview(fileBuffer);
        logger.info(`✅ Image preview generated: ${previewBuffer ? 'Yes' : 'No'}`);
      } else if (UPLOAD_CONFIG.videoTypes.includes(fileType)) {
        logger.info(`Processing video file: ${fileName}`);
        // Process video
        watermarkedBuffer = await this.generateVideoWatermark(
          fileBuffer,
          watermarkText,
          watermarkOptions
        );
        previewBuffer = await this.generateVideoPreview(fileBuffer);
        logger.info(`✅ Video preview generated: ${previewBuffer ? 'Yes' : 'No'}`);
      } else {
        logger.info(`File type ${fileType} not supported for watermarking/preview generation`);
        // For other file types, return original buffer
        watermarkedBuffer = fileBuffer;
      }

      // Generate S3 keys
      const s3Key = generateS3Key(fileName, 'watermarked');
      const previewS3Key = previewBuffer ? generateS3Key(fileName, 'previews') : undefined;

      const result: {
        watermarkedBuffer: Buffer;
        previewBuffer?: Buffer;
        s3Key: string;
        previewS3Key?: string;
      } = {
        watermarkedBuffer,
        s3Key
      };
      
      if (previewBuffer) {
        result.previewBuffer = previewBuffer;
      }
      
      if (previewS3Key) {
        result.previewS3Key = previewS3Key;
      }
      
      return result;
    } catch (error) {
      logger.error('Error processing file:', error);
      throw error;
    }
  }

  // Upload processed files to R2
  static async uploadProcessedFiles(
    watermarkedBuffer: Buffer,
    previewBuffer: Buffer | undefined,
    s3Key: string,
    previewS3Key: string | undefined,
    mimeType: string
  ): Promise<{
    watermarkedUrl: string;
    previewUrl?: string;
  }> {
    logger.info(`Uploading watermarked file to R2: ${s3Key}`);
    // Upload watermarked file
    const watermarkedResult = await uploadToR2(s3Key, watermarkedBuffer, mimeType);
    logger.info(`✅ Watermarked file uploaded: ${watermarkedResult.Location}`);
    
    let previewResult;
    if (previewBuffer && previewS3Key) {
      logger.info(`Uploading preview file to R2: ${previewS3Key}`);
      previewResult = await uploadToR2(previewS3Key, previewBuffer, 'image/png');
      logger.info(`✅ Preview file uploaded: ${previewResult.Location}`);
    } else {
      logger.warn(`No preview buffer or S3 key available for upload`);
    }

    const result: {
      watermarkedUrl: string;
      previewUrl?: string;
    } = {
      watermarkedUrl: watermarkedResult.Location
    };
    
    if (previewResult?.Location) {
      result.previewUrl = previewResult.Location;
    }
    
    logger.info(`Final result - Watermarked URL: ${result.watermarkedUrl}, Preview URL: ${result.previewUrl || 'None'}`);
    return result;
  }

  // Helper method to get video position X
  private static getVideoPositionX(position: string, x: number): string {
    switch (position) {
      case 'top-left':
        return '20';
      case 'top-right':
        return 'w-text_w-20';
      case 'bottom-left':
        return '20';
      case 'bottom-right':
        return 'w-text_w-20';
      case 'center':
        return '(w-text_w)/2';
      default:
        return 'w-text_w-20';
    }
  }

  // Helper method to get video position Y
  private static getVideoPositionY(position: string, y: number): string {
    switch (position) {
      case 'top-left':
        return '20';
      case 'top-right':
        return '20';
      case 'bottom-left':
        return 'h-text_h-20';
      case 'bottom-right':
        return 'h-text_h-20';
      case 'center':
        return '(h-text_h)/2';
      default:
        return 'h-text_h-20';
    }
  }
}
