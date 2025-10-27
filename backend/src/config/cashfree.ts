import axios, { AxiosInstance } from 'axios';
import { logger } from '@/utils/logger';

// Cashfree Configuration
const cashfreeConfig = {
  appId: process.env.CASHFREE_APP_ID || '',
  secretKey: process.env.CASHFREE_SECRET_KEY || '',
  environment: process.env.CASHFREE_ENV || 'sandbox', // 'sandbox' or 'production'
};

// Base URLs for different environments
export const CASHFREE_BASE_URL = cashfreeConfig.environment === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

// Validate Cashfree credentials and log config on startup
if (!cashfreeConfig.appId || !cashfreeConfig.secretKey) {
  logger.warn('⚠️  Cashfree credentials not configured. Payment features will be disabled.');
} else {
  // Log config for debugging (with masked credentials)
  logger.info('🔐 Cashfree Config:', {
    env: cashfreeConfig.environment,
    appId: cashfreeConfig.appId,
    secretKeyLast4: '...' + cashfreeConfig.secretKey.slice(-4),
    baseURL: CASHFREE_BASE_URL,
    apiVersion: '2023-08-01'
  });
}

// Platform commission rate (10% by default)
export const PLATFORM_COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10');

// Return URL for payment redirects
export const PAYMENT_RETURN_URL = process.env.FRONTEND_URL 
  ? `${process.env.FRONTEND_URL}/payment/callback`
  : 'http://localhost:8080/payment/callback';

// Webhook URL for payment notifications
export const PAYMENT_WEBHOOK_URL = process.env.BACKEND_URL
  ? `${process.env.BACKEND_URL}/api/v1/payments/webhook`
  : 'http://localhost:5000/api/v1/payments/webhook';

export const CASHFREE_CONFIGURED = !!(cashfreeConfig.appId && cashfreeConfig.secretKey);
export const CASHFREE_ENVIRONMENT = cashfreeConfig.environment;

logger.info(`💳 Cashfree configured in ${cashfreeConfig.environment} mode`);
if (CASHFREE_CONFIGURED) {
  logger.info(`✅ Cashfree payment gateway enabled`);
  logger.info(`📊 Platform commission rate: ${PLATFORM_COMMISSION_RATE * 100}%`);
} else {
  logger.warn('❌ Cashfree payment gateway disabled - missing credentials');
}

// Create axios instance for Cashfree API calls
export const cashfreeAPI: AxiosInstance = axios.create({
  baseURL: CASHFREE_BASE_URL,
  headers: {
    'x-client-id': cashfreeConfig.appId,
    'x-client-secret': cashfreeConfig.secretKey,
    'x-api-version': '2023-08-01',
    'Content-Type': 'application/json'
  }
});

// Cashfree API functions
export interface CreateOrderRequest {
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
    notify_url?: string;
  };
  order_tags?: Record<string, string>;
}

export interface CreateOrderResponse {
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
    notify_url?: string;
  };
  order_status: string;
  order_tags?: Record<string, any>;
  payment_session_id: string;
}

export async function createPaymentOrder(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
  try {
    logger.info('📤 Sending order to Cashfree:', {
      orderId: orderData.order_id,
      amount: orderData.order_amount,
      environment: cashfreeConfig.environment,
      baseURL: CASHFREE_BASE_URL
    });
    
    const response = await cashfreeAPI.post<CreateOrderResponse>('/orders', orderData);
    
    logger.info('✅ Cashfree order created successfully:', {
      cfOrderId: response.data.cf_order_id,
      paymentSessionId: response.data.payment_session_id
    });
    
    return response.data;
  } catch (error: any) {
    const errorData = error.response?.data;
    logger.error('❌ Cashfree API error:', errorData || error.message);
    
    // Check for authentication failure
    if (errorData?.type === 'authentication_error' || errorData?.message?.includes('authentication')) {
      logger.error('🔑 Authentication failed! Please check:');
      logger.error('  - App ID and Secret Key match the current environment');
      logger.error(`  - Environment: ${cashfreeConfig.environment}`);
      logger.error(`  - Base URL: ${CASHFREE_BASE_URL}`);
      logger.error(`  - App ID: ${cashfreeConfig.appId}`);
      logger.error(`  - Secret Key ends with: ...${cashfreeConfig.secretKey.slice(-4)}`);
      
      const authError: any = new Error('Invalid credentials or environment mismatch');
      authError.statusCode = 400;
      authError.data = {
        error: 'Invalid credentials or environment mismatch',
        suggestion: 'Check if App ID/Secret Key match the current environment (sandbox or production)',
        environment: cashfreeConfig.environment
      };
      throw authError;
    }
    
    throw error;
  }
}

export async function getOrderStatus(orderId: string): Promise<any> {
  try {
    const response = await cashfreeAPI.get(`/orders/${orderId}`);
    return response.data;
  } catch (error: any) {
    logger.error('Cashfree get order status error:', error.response?.data || error.message);
    throw error;
  }
}

// Test authentication with Cashfree
export async function testAuthentication(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    logger.info('🧪 Testing Cashfree authentication...');
    
    // Try to fetch orders (will fail if no orders exist, but auth should work)
    // Using a dummy order ID to test auth
    const testOrderId = 'test_order_' + Date.now();
    
    try {
      await cashfreeAPI.get(`/orders/${testOrderId}`);
    } catch (error: any) {
      // If we get 404 or "order not found", auth is working!
      if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
        logger.info('✅ Cashfree authentication successful (404 expected for test order)');
        return {
          success: true,
          message: 'Authentication successful',
          details: {
            environment: cashfreeConfig.environment,
            baseURL: CASHFREE_BASE_URL,
            appId: cashfreeConfig.appId
          }
        };
      }
      
      // If we get auth error, credentials are wrong
      if (error.response?.data?.type === 'authentication_error') {
        logger.error('❌ Cashfree authentication failed');
        return {
          success: false,
          message: 'Authentication failed - Invalid credentials',
          details: {
            environment: cashfreeConfig.environment,
            baseURL: CASHFREE_BASE_URL,
            error: error.response.data
          }
        };
      }
      
      throw error;
    }
    
    return {
      success: true,
      message: 'Authentication successful'
    };
  } catch (error: any) {
    logger.error('❌ Test authentication error:', error.response?.data || error.message);
    return {
      success: false,
      message: 'Authentication test failed',
      details: error.response?.data || error.message
    };
  }
}

export default {
  createPaymentOrder,
  getOrderStatus,
  testAuthentication,
  CASHFREE_CONFIGURED,
  CASHFREE_ENVIRONMENT,
  PLATFORM_COMMISSION_RATE,
  PAYMENT_RETURN_URL,
  PAYMENT_WEBHOOK_URL
};
