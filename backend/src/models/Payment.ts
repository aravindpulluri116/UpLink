import mongoose, { Schema } from 'mongoose';
import { IPayment } from '@/types';

const paymentSchema = new Schema<IPayment>({
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
  clientId: {
    type: String,
    required: [true, 'Client ID is required'],
    ref: 'User'
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    default: 'INR',
    uppercase: true
  },
  status: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: ['upi', 'card', 'netbanking', 'wallet']
  },
  cashfreeOrderId: {
    type: String,
    unique: true,
    sparse: true // Allows null values but ensures uniqueness when present
  },
  cashfreePaymentId: {
    type: String,
    unique: true,
    sparse: true
  },
  upiId: {
    type: String,
    trim: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  failureReason: {
    type: String,
    trim: true
  },
  paidAt: {
    type: Date,
    default: null
  },
  // Commission and payout tracking
  platformCommission: {
    type: Number,
    default: 0
  },
  creatorShare: {
    type: Number,
    default: 0
  },
  payoutStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'not_required'],
    default: 'pending'
  },
  payoutId: {
    type: String,
    sparse: true
  },
  payoutTransferId: {
    type: String,
    sparse: true
  },
  payoutUtr: {
    type: String,
    sparse: true
  },
  payoutAt: {
    type: Date,
    default: null
  },
  payoutFailureReason: {
    type: String,
    trim: true
  },
  creatorUpiPhone: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
paymentSchema.index({ fileId: 1 });
paymentSchema.index({ creatorId: 1 });
paymentSchema.index({ clientId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
// Note: cashfreeOrderId, cashfreePaymentId, and transactionId indexes are automatically created by unique: true
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ paidAt: -1 });

// Compound indexes
paymentSchema.index({ creatorId: 1, status: 1 });
paymentSchema.index({ clientId: 1, status: 1 });
paymentSchema.index({ fileId: 1, status: 1 });

// Virtual for payment summary
paymentSchema.virtual('summary').get(function() {
  return {
    id: this._id,
    fileId: this.fileId,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    paymentMethod: this.paymentMethod,
    createdAt: this.createdAt,
    paidAt: this.paidAt
  };
});

// Virtual for payment details (includes sensitive info)
paymentSchema.virtual('details').get(function() {
  return {
    id: this._id,
    fileId: this.fileId,
    creatorId: this.creatorId,
    clientId: this.clientId,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    paymentMethod: this.paymentMethod,
    cashfreeOrderId: this.cashfreeOrderId,
    cashfreePaymentId: this.cashfreePaymentId,
    upiId: this.upiId,
    transactionId: this.transactionId,
    failureReason: this.failureReason,
    createdAt: this.createdAt,
    paidAt: this.paidAt
  };
});

// Pre-save middleware to generate unique order ID
paymentSchema.pre('save', function(next) {
  if (this.isNew && !this.cashfreeOrderId) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    this.cashfreeOrderId = `uplink_${timestamp}_${randomString}`;
  }
  next();
});

// Static method to find payments by creator
paymentSchema.statics.findByCreator = function(creatorId: string) {
  return this.find({ creatorId }).sort({ createdAt: -1 });
};

// Static method to find payments by client
paymentSchema.statics.findByClient = function(clientId: string) {
  return this.find({ clientId }).sort({ createdAt: -1 });
};

// Static method to find payments by file
paymentSchema.statics.findByFile = function(fileId: string) {
  return this.find({ fileId }).sort({ createdAt: -1 });
};

// Static method to find completed payments
paymentSchema.statics.findCompleted = function() {
  return this.find({ status: 'completed' }).sort({ paidAt: -1 });
};

// Static method to find pending payments
paymentSchema.statics.findPending = function() {
  return this.find({ status: 'pending' }).sort({ createdAt: -1 });
};

// Static method to get payment statistics
paymentSchema.statics.getStats = function(creatorId?: string) {
  const matchStage = creatorId ? { creatorId } : {};
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Instance method to mark as completed
paymentSchema.methods.markCompleted = function(transactionId: string, paymentId?: string) {
  this.status = 'completed';
  this.transactionId = transactionId;
  this.paidAt = new Date();
  if (paymentId) {
    this.cashfreePaymentId = paymentId;
  }
  return this.save();
};

// Instance method to mark as failed
paymentSchema.methods.markFailed = function(reason: string) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Instance method to mark as processing
paymentSchema.methods.markProcessing = function() {
  this.status = 'processing';
  return this.save();
};

// Instance method to refund
paymentSchema.methods.refund = function() {
  this.status = 'refunded';
  return this.save();
};

// Instance method to mark payout as completed
paymentSchema.methods.markPayoutCompleted = function(payoutId: string, transferId: string, utr?: string) {
  this.payoutStatus = 'completed';
  this.payoutId = payoutId;
  this.payoutTransferId = transferId;
  this.payoutUtr = utr;
  this.payoutAt = new Date();
  return this.save();
};

// Instance method to mark payout as failed
paymentSchema.methods.markPayoutFailed = function(reason: string) {
  this.payoutStatus = 'failed';
  this.payoutFailureReason = reason;
  return this.save();
};

// Instance method to mark payout as processing
paymentSchema.methods.markPayoutProcessing = function() {
  this.payoutStatus = 'processing';
  return this.save();
};

export const Payment = mongoose.model<IPayment>('Payment', paymentSchema);
