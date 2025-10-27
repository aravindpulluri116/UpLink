import mongoose, { Schema } from 'mongoose';
import { IAnalytics } from '@/types';

const analyticsSchema = new Schema<IAnalytics>({
  fileId: {
    type: String,
    required: [true, 'File ID is required'],
    ref: 'File'
  },
  creatorId: {
    type: String,
    required: [true, 'Creator ID is required'],
    ref: 'User'
  },
  eventType: {
    type: String,
    required: [true, 'Event type is required'],
    enum: ['view', 'download', 'payment', 'share'],
    lowercase: true
  },
  clientId: {
    type: String,
    ref: 'User',
    default: null
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  referrer: {
    type: String,
    trim: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
analyticsSchema.index({ fileId: 1 });
analyticsSchema.index({ creatorId: 1 });
analyticsSchema.index({ clientId: 1 });
analyticsSchema.index({ eventType: 1 });
analyticsSchema.index({ createdAt: -1 });
analyticsSchema.index({ ipAddress: 1 });

// Compound indexes
analyticsSchema.index({ fileId: 1, eventType: 1 });
analyticsSchema.index({ creatorId: 1, eventType: 1 });
analyticsSchema.index({ fileId: 1, createdAt: -1 });
analyticsSchema.index({ creatorId: 1, createdAt: -1 });

// TTL index to automatically delete old analytics (keep for 1 year)
analyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// Virtual for event summary
analyticsSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    fileId: this.fileId,
    eventType: this.eventType,
    createdAt: this.createdAt,
    metadata: this.metadata
  };
});

// Static method to track event
analyticsSchema.statics.trackEvent = function(data: {
  fileId: string;
  creatorId: string;
  eventType: string;
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  metadata?: Record<string, any>;
}) {
  return this.create(data);
};

// Static method to get file analytics
analyticsSchema.statics.getFileAnalytics = function(fileId: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = { fileId };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        uniqueClients: { $addToSet: '$clientId' }
      }
    },
    {
      $project: {
        eventType: '$_id',
        count: 1,
        uniqueClients: { $size: '$uniqueClients' }
      }
    }
  ]);
};

// Static method to get creator analytics
analyticsSchema.statics.getCreatorAnalytics = function(creatorId: string, startDate?: Date, endDate?: Date) {
  const matchStage: any = { creatorId };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = startDate;
    if (endDate) matchStage.createdAt.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          fileId: '$fileId',
          eventType: '$eventType'
        },
        count: { $sum: 1 },
        uniqueClients: { $addToSet: '$clientId' }
      }
    },
    {
      $group: {
        _id: '$_id.fileId',
        events: {
          $push: {
            eventType: '$_id.eventType',
            count: '$count',
            uniqueClients: { $size: '$uniqueClients' }
          }
        },
        totalEvents: { $sum: '$count' }
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: '_id',
        foreignField: '_id',
        as: 'file'
      }
    },
    {
      $unwind: '$file'
    },
    {
      $project: {
        fileId: '$_id',
        fileName: '$file.originalName',
        fileType: '$file.fileType',
        events: 1,
        totalEvents: 1
      }
    }
  ]);
};

// Static method to get dashboard stats
analyticsSchema.statics.getDashboardStats = function(creatorId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        creatorId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          eventType: '$eventType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        events: {
          $push: {
            eventType: '$_id.eventType',
            count: '$count'
          }
        },
        totalEvents: { $sum: '$count' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ]);
};

// Static method to get top files
analyticsSchema.statics.getTopFiles = function(creatorId: string, limit: number = 10) {
  return this.aggregate([
    { $match: { creatorId } },
    {
      $group: {
        _id: '$fileId',
        totalViews: {
          $sum: { $cond: [{ $eq: ['$eventType', 'view'] }, 1, 0] }
        },
        totalDownloads: {
          $sum: { $cond: [{ $eq: ['$eventType', 'download'] }, 1, 0] }
        },
        totalPayments: {
          $sum: { $cond: [{ $eq: ['$eventType', 'payment'] }, 1, 0] }
        },
        uniqueClients: { $addToSet: '$clientId' }
      }
    },
    {
      $project: {
        fileId: '$_id',
        totalViews: 1,
        totalDownloads: 1,
        totalPayments: 1,
        uniqueClients: { $size: '$uniqueClients' }
      }
    },
    {
      $lookup: {
        from: 'files',
        localField: 'fileId',
        foreignField: '_id',
        as: 'file'
      }
    },
    {
      $unwind: '$file'
    },
    {
      $project: {
        fileId: 1,
        fileName: '$file.originalName',
        fileType: '$file.fileType',
        price: '$file.price',
        totalViews: 1,
        totalDownloads: 1,
        totalPayments: 1,
        uniqueClients: 1,
        totalRevenue: { $multiply: ['$totalPayments', '$file.price'] }
      }
    },
    {
      $sort: { totalViews: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

export const Analytics = mongoose.model<IAnalytics>('Analytics', analyticsSchema);
