// @ts-nocheck
import { Request, Response } from 'express';
import { Analytics, File, Payment } from '@/models';
import { ApiResponse, AuthRequest } from '@/types';
import { logger } from '@/utils/logger';

// Track analytics event
export const trackEvent = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { fileId, eventType, metadata } = req.body;
    const user = req.user!;

    // Verify file exists and user has access
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check if user can access this file
    if (!file.isPublic && file.creatorId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Track the event
    const analytics = new Analytics({
      fileId: file._id.toString(),
      creatorId: file.creatorId.toString(),
      eventType,
      clientId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      referrer: req.get('Referer'),
      metadata
    });

    await analytics.save();

    res.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    logger.error('Track event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track event'
    });
  }
};

// Get file analytics
export const getFileAnalytics = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { fileId } = req.params;
    const { startDate, endDate } = req.query;
    const user = req.user!;

    // Verify file exists and user owns it
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    if (file.creatorId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Parse dates
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Get analytics data
    const analytics = await Analytics.getFileAnalytics(fileId, start, end);

    // Get total views, downloads, and payments
    const totalViews = await Analytics.countDocuments({
      fileId, 
      eventType: 'view',
      ...(start && { createdAt: { $gte: start } }),
      ...(end && { createdAt: { $lte: end } })
    });

    const totalDownloads = await Analytics.countDocuments({ 
      fileId, 
      eventType: 'download',
      ...(start && { createdAt: { $gte: start } }),
      ...(end && { createdAt: { $lte: end } })
    });

    const totalPayments = await Analytics.countDocuments({ 
      fileId, 
      eventType: 'payment',
      ...(start && { createdAt: { $gte: start } }),
      ...(end && { createdAt: { $lte: end } })
    });

    res.json({
      success: true,
      message: 'File analytics retrieved successfully',
      data: {
        fileId,
        fileName: file.originalName,
        totalViews,
        totalDownloads,
        totalPayments,
        analytics
      }
    });
  } catch (error) {
    logger.error('Get file analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve file analytics'
    });
  }
};

// Get creator analytics
export const getCreatorAnalytics = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user!;

    // Parse dates
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    // Get analytics data
    const analytics = await Analytics.getCreatorAnalytics(user._id.toString(), start, end);

    // Get dashboard stats
    const dashboardStats = await Analytics.getDashboardStats(user._id.toString(), 30);

    // Get top files
    const topFiles = await Analytics.getTopFiles(user._id.toString(), 10);

    res.json({
      success: true,
      message: 'Creator analytics retrieved successfully',
      data: {
        analytics,
        dashboardStats,
        topFiles
      }
    });
  } catch (error) {
    logger.error('Get creator analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve creator analytics'
    });
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { days = 30 } = req.query;
    const user = req.user!;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Get file statistics
    const totalFiles = await File.countDocuments({ creatorId: user._id.toString() });
    const publicFiles = await File.countDocuments({ 
      creatorId: user._id.toString(), 
      isPublic: true 
    });
    const totalRevenue = await Payment.aggregate([
      {
        $match: {
          creatorId: user._id.toString(),
          status: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    // Get analytics data
    const analytics = await Analytics.getDashboardStats(user._id.toString(), Number(days));

    // Get recent activity
    const recentActivity = await Analytics.find({ creatorId: user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('fileId', 'originalName fileType')
      .populate('clientId', 'name email');

    res.json({
      success: true,
      message: 'Dashboard statistics retrieved successfully',
      data: {
        totalFiles,
        publicFiles,
        totalRevenue: totalRevenue[0]?.total || 0,
        analytics,
        recentActivity
      }
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard statistics'
    });
  }
};

// Get top performing files
export const getTopFiles = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { limit = 10 } = req.query;
    const user = req.user!;

    const topFiles = await Analytics.getTopFiles(user._id.toString(), Number(limit));

    res.json({
      success: true,
      message: 'Top files retrieved successfully',
      data: { topFiles }
    });
  } catch (error) {
    logger.error('Get top files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve top files'
    });
  }
};
