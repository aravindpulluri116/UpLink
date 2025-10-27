import { Request } from 'express';
import { Document } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  upiId?: string;
  avatar?: string;
  isVerified: boolean;
  isActive: boolean;
  role: 'creator' | 'client' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// File Types
export interface IFile extends Document {
  _id: string;
  creatorId: string;
  originalName: string;
  fileName: string;
  fileType: 'video' | 'image' | 'document' | '3d' | 'audio';
  mimeType: string;
  size: number;
  s3Key: string;
  s3Url: string;
  previewS3Key?: string;
  previewS3Url?: string;
  watermarkS3Key?: string;
  watermarkS3Url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'delivered' | 'failed';
  isPublic: boolean;
  price?: number;
  currency?: string;
  description?: string;
  tags?: string[];
  metadata?: {
    duration?: number;
    dimensions?: { width: number; height: number };
    format?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Payment Types
export interface IPayment extends Document {
  _id: string;
  fileId: string;
  creatorId: string;
  clientId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet';
  cashfreeOrderId?: string;
  cashfreePaymentId?: string;
  upiId?: string;
  transactionId?: string;
  failureReason?: string;
  paidAt?: Date;
  // Commission and payout tracking
  platformCommission: number;
  creatorShare: number;
  payoutStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'not_required';
  payoutId?: string;
  payoutTransferId?: string;
  payoutUtr?: string;
  payoutAt?: Date;
  payoutFailureReason?: string;
  creatorUpiPhone?: string;
  createdAt: Date;
  updatedAt: Date;
  // Methods
  markCompleted(transactionId: string, paymentId?: string): Promise<IPayment>;
  markFailed(reason: string): Promise<IPayment>;
  markProcessing(): Promise<IPayment>;
  refund(): Promise<IPayment>;
  markPayoutCompleted(payoutId: string, transferId: string, utr?: string): Promise<IPayment>;
  markPayoutFailed(reason: string): Promise<IPayment>;
  markPayoutProcessing(): Promise<IPayment>;
}

// Analytics Types
export interface IAnalytics extends Document {
  _id: string;
  fileId: string;
  creatorId: string;
  eventType: 'view' | 'download' | 'payment' | 'share';
  clientId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Request Types
export interface AuthRequest extends Request {
  user?: IUser;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string | any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// File Upload Types
export interface FileUploadResult {
  originalName: string;
  fileName: string;
  s3Key: string;
  s3Url: string;
  size: number;
  mimeType: string;
}

// Watermark Types
export interface WatermarkOptions {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  fontSize: number;
  color: string;
}

// Payment Gateway Types
export interface CashfreeOrderRequest {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  order_meta: {
    return_url: string;
    notify_url: string;
  };
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  created_at: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  entity: string;
  order_amount: number;
  order_currency: string;
  order_expiry_time: string;
  order_id: string;
  order_meta: {
    return_url: string;
    notify_url: string;
  };
  order_status: string;
  order_tags: any;
  payment_session_id: string;
}

// JWT Payload Types
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Environment Variables Types
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
  S3_BUCKET_NAME: string;
  CASHFREE_APP_ID: string;
  CASHFREE_SECRET_KEY: string;
  CASHFREE_ENVIRONMENT: string;
}
