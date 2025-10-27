import { Request, Response } from 'express';
import { User, File, Payment, Analytics } from '@/models';
import { ApiResponse, AuthRequest } from '@/types';
import { logger } from '@/utils/logger';

// Get user profile
export const getUserProfile = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    // If requesting own profile, return full data
    if (id === currentUser._id.toString()) {
      res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: { user: currentUser }
      });
      return;
    }

    // For other users, return public profile only
    const user = await User.findById(id).select('-email -phone -upiId');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Get user's public files count
    const publicFilesCount = await File.countDocuments({ 
      creatorId: id, 
      isPublic: true 
    });

    res.json({
      success: true,
      message: 'User profile retrieved successfully',
      data: { 
        user: {
          id: user._id,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.createdAt,
          publicFilesCount
        }
      }
    });
  } catch (error) {
    logger.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile'
    });
  }
};

// Get user's public files
export const getUserPublicFiles = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Get user's public files
    const files = await File.find({ 
      creatorId: id, 
      isPublic: true, 
      status: 'ready' 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-s3Key -watermarkS3Key -previewS3Key')
      .populate('creatorId', 'name');

    const total = await File.countDocuments({ 
      creatorId: id, 
      isPublic: true, 
      status: 'ready' 
    });

    res.json({
      success: true,
      message: 'User public files retrieved successfully',
      data: { 
        files,
        creator: {
          id: user._id,
          name: user.name,
          avatar: user.avatar
        }
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get user public files error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user public files'
    });
  }
};

// Search users
export const searchUsers = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { q, page = 1, limit = 10 } = req.query;

    if (!q || (q as string).trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
      return;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const searchRegex = new RegExp(q as string, 'i');

    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ],
      isActive: true
    })
      .select('name avatar role createdAt')
      .sort({ name: 1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments({
      $or: [
        { name: searchRegex },
        { email: searchRegex }
      ],
      isActive: true
    });

    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: { users },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users'
    });
  }
};

// Get user statistics (for profile page)
export const getUserStats = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify user exists
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Get user's file statistics
    const totalFiles = await File.countDocuments({ creatorId: id });
    const publicFiles = await File.countDocuments({ 
      creatorId: id, 
      isPublic: true 
    });

    // Get total views across all files
    const totalViews = await Analytics.aggregate([
      {
        $match: { creatorId: id }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: { $cond: [{ $eq: ['$eventType', 'view'] }, 1, 0] } },
          totalDownloads: { $sum: { $cond: [{ $eq: ['$eventType', 'download'] }, 1, 0] } },
          totalPayments: { $sum: { $cond: [{ $eq: ['$eventType', 'payment'] }, 1, 0] } }
        }
      }
    ]);

    // Get total revenue
    const totalRevenue = await Payment.aggregate([
      {
        $match: {
          creatorId: id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const stats = {
      totalFiles,
      publicFiles,
      totalViews: totalViews[0]?.totalViews || 0,
      totalDownloads: totalViews[0]?.totalDownloads || 0,
      totalPayments: totalViews[0]?.totalPayments || 0,
      totalRevenue: totalRevenue[0]?.total || 0
    };

    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: { stats }
    });
  } catch (error) {
    logger.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics'
    });
  }
};
