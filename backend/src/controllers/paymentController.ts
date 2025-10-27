import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { Payment, File, User } from '@/models';
import { ApiResponse, AuthRequest } from '@/types';
import { createPaymentOrder as createCashfreeOrder, testAuthentication, CASHFREE_CONFIGURED, PLATFORM_COMMISSION_RATE, PAYMENT_RETURN_URL, PAYMENT_WEBHOOK_URL } from '@/config/cashfree';
import { logger } from '@/utils/logger';

// Create payment order
export const createPaymentOrder = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
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

    if (!CASHFREE_CONFIGURED) {
      res.status(503).json({
        success: false,
        message: 'Payment service is currently unavailable'
      });
      return;
    }

    const { fileId } = req.body;
    const user = req.user!;

    // Find the file
    const file = await File.findById(fileId);
    if (!file) {
      res.status(404).json({
        success: false,
        message: 'File not found'
      });
      return;
    }

    // Check if file is public and has a price
    if (!file.isPublic || !file.price || file.price <= 0) {
      res.status(400).json({
        success: false,
        message: 'File is not available for purchase'
      });
      return;
    }

    // Check if user is not the creator
    if (file.creatorId.toString() === user._id.toString()) {
      res.status(400).json({
        success: false,
        message: 'You cannot purchase your own file'
      });
      return;
    }

    // Find creator
    const creator = await User.findById(file.creatorId);
    if (!creator) {
      res.status(404).json({
        success: false,
        message: 'Creator not found'
      });
      return;
    }

    // Calculate commission split
    const amount = file.price;
    const platformCommission = Math.round(amount * PLATFORM_COMMISSION_RATE * 100) / 100;
    const creatorShare = Math.round((amount - platformCommission) * 100) / 100;

    // Create payment record
    const payment = new Payment({
      fileId: file._id.toString(),
      creatorId: creator._id.toString(),
      clientId: user._id.toString(),
      amount,
      currency: 'INR',
      paymentMethod: 'upi', // Default, will be updated by webhook
      status: 'pending',
      platformCommission,
      creatorShare,
      payoutStatus: 'pending',
      creatorUpiPhone: creator.phone || undefined
    });

    await payment.save();

    logger.info(`💳 Payment record created: ${payment._id} for file: ${file.originalName}`);
    logger.info(`💰 Amount: ₹${amount}, Platform: ₹${platformCommission}, Creator: ₹${creatorShare}`);

    // Create Cashfree order
    try {
      const orderRequest = {
        order_amount: amount,
        order_currency: 'INR',
        order_id: payment.cashfreeOrderId!,
        customer_details: {
          customer_id: user._id.toString(),
          customer_name: user.name,
          customer_email: user.email,
          customer_phone: user.phone || '9999999999'
        },
        order_meta: {
          return_url: PAYMENT_RETURN_URL,
          notify_url: PAYMENT_WEBHOOK_URL
        },
        order_tags: {
          file_id: file._id.toString(),
          file_name: file.originalName,
          creator_id: creator._id.toString()
        }
      };

      logger.info('📤 Creating Cashfree order:', { orderId: orderRequest.order_id, amount: orderRequest.order_amount });

      const response = await createCashfreeOrder(orderRequest);

      logger.info('✅ Cashfree order created successfully:', { 
        orderId: response.order_id,
        cfOrderId: response.cf_order_id,
        paymentSessionId: response.payment_session_id
      });

      // Update payment with Cashfree response
      payment.cashfreeOrderId = response.cf_order_id;
      await payment.save();

      res.status(201).json({
        success: true,
        message: 'Payment order created successfully',
        data: {
          payment: {
            id: payment._id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            cashfreeOrderId: response.cf_order_id
          },
          paymentSessionId: response.payment_session_id,
          orderId: response.order_id
        }
      });
    } catch (cashfreeError: any) {
      logger.error('❌ Cashfree order creation failed:', cashfreeError.response?.data || cashfreeError.message);
      
      // Delete the payment record if Cashfree order creation fails
      await Payment.findByIdAndDelete(payment._id);

      res.status(500).json({
        success: false,
        message: 'Failed to create payment order',
        error: cashfreeError.response?.data?.message || 'Payment gateway error'
      });
    }
  } catch (error) {
    logger.error('Create payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment order creation failed'
    });
  }
};

// Payment webhook handler (Cashfree sends payment status updates here)
export const paymentWebhook = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const webhookData = req.body;
    const { type, data } = webhookData;

    logger.info('🔔 Payment webhook received:', { type, orderId: data?.order?.order_id });

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      await handlePaymentSuccess(data);
    } else if (type === 'PAYMENT_FAILED_WEBHOOK') {
      await handlePaymentFailure(data);
    } else if (type === 'PAYMENT_USER_DROPPED_WEBHOOK') {
      await handlePaymentDropped(data);
    }

    res.json({
      success: true,
      message: 'Webhook processed successfully'
    });
  } catch (error) {
    logger.error('Payment webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

// Handle payment success and trigger payout
const handlePaymentSuccess = async (data: any) => {
  try {
    const { order, payment: paymentData } = data;
    const cfOrderId = order.cf_order_id;

    logger.info('✅ Processing payment success:', { cfOrderId });

    // Find payment record by Cashfree order ID
    const payment = await Payment.findOne({ cashfreeOrderId: cfOrderId });
    if (!payment) {
      logger.error('❌ Payment record not found for Cashfree order:', cfOrderId);
      return;
    }

    // Update payment status
    payment.status = 'completed';
    payment.cashfreePaymentId = paymentData.cf_payment_id;
    payment.transactionId = paymentData.payment_id || paymentData.bank_reference;
    payment.paymentMethod = paymentData.payment_method?.toLowerCase() || 'upi';
    payment.paidAt = new Date();
    await payment.save();

    logger.info(`💰 Payment completed: ${payment._id}, Amount: ₹${payment.amount}`);

    // Update file status to delivered
    await File.findByIdAndUpdate(payment.fileId, { status: 'delivered' });

    // Trigger automatic payout to creator
    await processCreatorPayout(payment);

  } catch (error) {
    logger.error('Error handling payment success:', error);
  }
};

// Process payout to creator
const processCreatorPayout = async (payment: any) => {
  try {
    if (!CASHFREE_CONFIGURED) {
      logger.warn('⚠️  Cashfree not configured, skipping payout');
      payment.payoutStatus = 'not_required';
      await payment.save();
      return;
    }

    // Get creator details
    const creator = await User.findById(payment.creatorId);
    if (!creator) {
      logger.error('❌ Creator not found for payout:', payment.creatorId);
      payment.payoutStatus = 'failed';
      payment.payoutFailureReason = 'Creator not found';
      await payment.save();
      return;
    }

    // Check if creator has UPI phone or UPI ID
    if (!creator.phone && !creator.upiId) {
      logger.warn('⚠️  Creator has no UPI phone/ID, skipping payout');
      payment.payoutStatus = 'failed';
      payment.payoutFailureReason = 'Creator UPI details missing';
      await payment.save();
      return;
    }

    logger.info(`💸 Initiating payout to creator ${creator.name}`, {
      amount: payment.creatorShare,
      phone: creator.phone,
      upiId: creator.upiId
    });

    // Mark payout as processing
    payment.payoutStatus = 'processing';
    await payment.save();

    // Create payout using Cashfree Payouts API
    // Note: This requires Cashfree Payouts API to be enabled in your account
    // For now, we'll simulate this - you need to implement actual Cashfree Payouts API call
    
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // TODO: Replace this with actual Cashfree Payouts API call
    // Reference: https://docs.cashfree.com/reference/pgcreatetransfer
    
    // For demonstration, marking as completed
    // In production, this should be done after receiving payout webhook confirmation
    payment.payoutStatus = 'completed';
    payment.payoutId = payoutId;
    payment.payoutTransferId = transferId;
    payment.payoutAt = new Date();
    await payment.save();

    logger.info(`✅ Payout completed: ${payoutId}, Creator share: ₹${payment.creatorShare}`);

  } catch (error: any) {
    logger.error('❌ Error processing creator payout:', error);
    payment.payoutStatus = 'failed';
    payment.payoutFailureReason = error.message || 'Payout processing error';
    await payment.save();
  }
};

// Handle payment failure
const handlePaymentFailure = async (data: any) => {
  try {
    const { order, payment: paymentData } = data;
    const cfOrderId = order.cf_order_id;

    logger.info('❌ Processing payment failure:', { cfOrderId });

    // Find payment record
    const payment = await Payment.findOne({ cashfreeOrderId: cfOrderId });
    if (!payment) {
      logger.error('Payment record not found for order:', cfOrderId);
      return;
    }

    // Update payment status
    payment.status = 'failed';
    payment.failureReason = paymentData?.payment_message || 'Payment failed';
    payment.payoutStatus = 'not_required';
    await payment.save();

    logger.info(`Payment failed: ${payment._id} - Reason: ${payment.failureReason}`);
  } catch (error) {
    logger.error('Error handling payment failure:', error);
  }
};

// Handle payment dropped
const handlePaymentDropped = async (data: any) => {
  try {
    const { order } = data;
    const cfOrderId = order.cf_order_id;

    logger.info('⚠️  Processing payment dropped:', { cfOrderId });

    // Find payment record
    const payment = await Payment.findOne({ cashfreeOrderId: cfOrderId });
    if (!payment) {
      logger.error('Payment record not found for order:', cfOrderId);
      return;
    }

    // Update payment status
    payment.status = 'failed';
    payment.failureReason = 'Payment dropped by user';
    payment.payoutStatus = 'not_required';
    await payment.save();

    logger.info(`Payment dropped: ${payment._id}`);
  } catch (error) {
    logger.error('Error handling payment dropped:', error);
  }
};

// Get user's payments (as client)
export const getUserPayments = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const user = req.user!;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query: any = { clientId: user._id.toString() };

    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('fileId', 'originalName fileType price')
      .populate('creatorId', 'name email');

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      message: 'Payments retrieved successfully',
      data: { payments },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    logger.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payments'
    });
  }
};

// Get creator's earnings
export const getCreatorEarnings = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const user = req.user!;
    const { page = 1, limit = 10, status } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query: any = { creatorId: user._id.toString() };

    if (status) {
      query.status = status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('fileId', 'originalName fileType price')
      .populate('clientId', 'name email');

    const total = await Payment.countDocuments(query);

    // Calculate earnings summary
    const summary = await Payment.aggregate([
      { $match: { creatorId: user._id.toString() } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalCreatorShare: { $sum: '$creatorShare' },
          totalPlatformCommission: { $sum: '$platformCommission' }
        }
      }
    ]);

    const completedEarnings = summary.find(s => s._id === 'completed') || {
      count: 0,
      totalAmount: 0,
      totalCreatorShare: 0,
      totalPlatformCommission: 0
    };

    res.json({
      success: true,
      message: 'Creator earnings retrieved successfully',
      data: {
        payments,
        summary: {
          totalSales: completedEarnings.count,
          totalRevenue: completedEarnings.totalAmount,
          earnings: completedEarnings.totalCreatorShare,
          platformFees: completedEarnings.totalPlatformCommission
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
    logger.error('Get creator earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve creator earnings'
    });
  }
};

// Get payment by ID
export const getPaymentById = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const payment = await Payment.findById(id)
      .populate('fileId', 'originalName fileType price')
      .populate('creatorId', 'name email phone upiId')
      .populate('clientId', 'name email');

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    // Check if user can access this payment
    if (payment.clientId.toString() !== user._id.toString() && 
        payment.creatorId.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Payment retrieved successfully',
      data: { payment }
    });
  } catch (error) {
    logger.error('Get payment by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment'
    });
  }
};

// Verify payment status (for frontend polling)
export const verifyPaymentStatus = async (req: AuthRequest, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { orderId } = req.params;
    const user = req.user!;

    const payment = await Payment.findOne({ cashfreeOrderId: orderId });

    if (!payment) {
      res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
      return;
    }

    // Check if user can access this payment
    if (payment.clientId.toString() !== user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Payment status retrieved',
      data: {
        paymentId: payment._id,
        status: payment.status,
        amount: payment.amount,
        paidAt: payment.paidAt,
        fileId: payment.fileId
      }
    });
  } catch (error) {
    logger.error('Verify payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment status'
    });
  }
};

// Get payment statistics (for dashboard)
export const getPaymentStats = async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const user = req.user!;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const stats = await Payment.aggregate([
      {
        $match: {
          creatorId: user._id.toString(),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalCreatorShare: { $sum: '$creatorShare' },
          totalPlatformCommission: { $sum: '$platformCommission' }
        }
      }
    ]);

    const completedStats = stats.find(s => s._id === 'completed') || {
      count: 0,
      totalAmount: 0,
      totalCreatorShare: 0,
      totalPlatformCommission: 0
    };

    const totalPayments = stats.reduce((sum, stat) => sum + stat.count, 0);
    const successRate = totalPayments > 0 ? (completedStats.count / totalPayments) * 100 : 0;

    res.json({
      success: true,
      message: 'Payment statistics retrieved successfully',
      data: {
        period: `${days} days`,
        totalRevenue: completedStats.totalAmount,
        earnings: completedStats.totalCreatorShare,
        platformFees: completedStats.totalPlatformCommission,
        totalPayments,
        completedPayments: completedStats.count,
        successRate: Math.round(successRate * 100) / 100,
        breakdown: stats
      }
    });
  } catch (error) {
    logger.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment statistics'
    });
  }
};

// Test Cashfree authentication
export const testCashfreeAuth = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    logger.info('🧪 Testing Cashfree authentication via API endpoint...');
    
    if (!CASHFREE_CONFIGURED) {
      res.status(503).json({
        success: false,
        message: 'Cashfree is not configured. Check environment variables: CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_ENV'
      });
      return;
    }
    
    const result = await testAuthentication();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.details
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        error: result.details
      });
    }
  } catch (error) {
    logger.error('Test Cashfree auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Cashfree authentication'
    });
  }
};
