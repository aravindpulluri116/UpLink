import mongoose, { Schema } from 'mongoose';
import { IFile } from '@/types';

const fileSchema = new Schema<IFile>({
  creatorId: {
    type: String,
    required: [true, 'Creator ID is required'],
    ref: 'User'
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true
  },
  fileName: {
    type: String,
    required: [true, 'Generated filename is required'],
    unique: true
  },
  fileType: {
    type: String,
    required: [true, 'File type is required'],
    enum: ['video', 'image', 'document', '3d', 'audio'],
    lowercase: true
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  size: {
    type: Number,
    required: [true, 'File size is required'],
    min: [0, 'File size cannot be negative']
  },
  s3Key: {
    type: String,
    required: [true, 'S3 key is required'],
    unique: true
  },
  s3Url: {
    type: String,
    required: [true, 'S3 URL is required']
  },
  previewS3Key: {
    type: String,
    default: null
  },
  previewS3Url: {
    type: String,
    default: null
  },
  watermarkS3Key: {
    type: String,
    default: null
  },
  watermarkS3Url: {
    type: String,
    default: null
  },
  status: {
    type: String,
    required: [true, 'File status is required'],
    enum: ['uploading', 'processing', 'ready', 'delivered', 'failed'],
    default: 'uploading'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
    default: 0
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    trim: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metadata: {
    duration: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    dimensions: {
      width: {
        type: Number,
        min: [0, 'Width cannot be negative']
      },
      height: {
        type: Number,
        min: [0, 'Height cannot be negative']
      }
    },
    format: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
fileSchema.index({ creatorId: 1 });
fileSchema.index({ fileType: 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ isPublic: 1 });
fileSchema.index({ price: 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ createdAt: -1 });
// Note: s3Key index is automatically created by unique: true

// Compound indexes
fileSchema.index({ creatorId: 1, status: 1 });
fileSchema.index({ fileType: 1, isPublic: 1 });
fileSchema.index({ tags: 1, isPublic: 1 });

// Virtual for file statistics
fileSchema.virtual('stats', {
  ref: 'Analytics',
  localField: '_id',
  foreignField: 'fileId',
  count: true
});

// Virtual for file URL with expiration
fileSchema.virtual('downloadUrl').get(function() {
  // This would be generated dynamically based on user permissions
  return this.s3Url;
});

// Virtual for preview URL
fileSchema.virtual('previewUrl').get(function() {
  return this.watermarkS3Url || this.previewS3Url || this.s3Url;
});

// Pre-save middleware to generate unique filename
fileSchema.pre('save', function(next) {
  if (this.isNew && !this.fileName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = this.originalName.split('.').pop();
    this.fileName = `${timestamp}_${randomString}.${extension}`;
  }
  next();
});

// Static method to find files by creator
fileSchema.statics.findByCreator = function(creatorId: string) {
  return this.find({ creatorId }).sort({ createdAt: -1 });
};

// Static method to find public files
fileSchema.statics.findPublic = function() {
  return this.find({ isPublic: true, status: 'ready' }).sort({ createdAt: -1 });
};

// Static method to find files by type
fileSchema.statics.findByType = function(fileType: string) {
  return this.find({ fileType, isPublic: true, status: 'ready' }).sort({ createdAt: -1 });
};

// Static method to search files
fileSchema.statics.search = function(query: string) {
  const searchRegex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { originalName: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ],
    isPublic: true,
    status: 'ready'
  }).sort({ createdAt: -1 });
};

// Instance method to update status
fileSchema.methods.updateStatus = function(status: string) {
  this.status = status;
  return this.save();
};

// Instance method to add tag
fileSchema.methods.addTag = function(tag: string) {
  if (!this.tags.includes(tag.toLowerCase())) {
    this.tags.push(tag.toLowerCase());
  }
  return this.save();
};

// Instance method to remove tag
fileSchema.methods.removeTag = function(tag: string) {
  this.tags = this.tags.filter((t: string) => t !== tag.toLowerCase());
  return this.save();
};

export const File = mongoose.model<IFile>('File', fileSchema);
