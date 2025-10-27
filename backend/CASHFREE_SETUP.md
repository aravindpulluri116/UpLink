# 💳 Cashfree Payment Integration Guide

Complete guide for setting up Cashfree payment gateway in UpLink platform.

## 📋 Overview

The UpLink platform now integrates with Cashfree to provide:
- ✅ Secure UPI/Card/NetBanking payments
- ✅ Automatic commission splitting (Platform + Creator)
- ✅ Real-time payment verification via webhooks
- ✅ Automatic payout to creators (coming soon)
- ✅ Payment-gated file access control

## 🚀 Setup Instructions

### 1. Get Cashfree Credentials

#### For Testing (Sandbox):
1. Go to [Cashfree Sandbox](https://sandbox.cashfree.com/merchants/login)
2. Create an account or login
3. Navigate to **Developers** > **API Keys**
4. Copy your:
   - `Client ID` (x-client-id)
   - `Client Secret` (x-client-secret)

#### For Production:
1. Go to [Cashfree Production](https://merchant.cashfree.com/merchants/login)
2. Complete KYC verification
3. Navigate to **Developers** > **API Keys**
4. Copy your production credentials

### 2. Configure Environment Variables

Create or update your `.env` file in the `backend` directory:

```bash
# Cashfree Payment Gateway
CASHFREE_CLIENT_ID=your_cashfree_client_id_here
CASHFREE_CLIENT_SECRET=your_cashfree_client_secret_here
CASHFREE_ENVIRONMENT=sandbox  # Change to 'production' for live

# Platform Configuration
PLATFORM_COMMISSION_RATE=0.10  # 10% platform commission

# URLs (Important for callbacks and webhooks)
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:5000
```

### 3. Install Dependencies

Backend dependencies are already installed. If needed:

```bash
cd backend
npm install
```

### 4. Build and Start the Backend

```bash
cd backend
npm run build
npm run dev
```

### 5. Frontend Setup

The frontend already has Cashfree SDK included via CDN in `index.html`.

```bash
cd frontend
npm run dev
```

## 📚 API Endpoints

### Payment Creation
```
POST /api/v1/payments/create-order
Authorization: Bearer <token>
Body: { "fileId": "file_id_here" }
```

**Response:**
```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "payment": {
      "id": "payment_id",
      "amount": 500,
      "currency": "INR",
      "status": "pending",
      "cashfreeOrderId": "cf_order_id"
    },
    "paymentSessionId": "session_id_for_checkout",
    "orderId": "order_id"
  }
}
```

### Verify Payment Status
```
GET /api/v1/payments/verify/:orderId
Authorization: Bearer <token>
```

### Webhook (No Auth Required)
```
POST /api/v1/payments/webhook
Body: Cashfree webhook payload
```

### Get Creator Earnings
```
GET /api/v1/payments/earnings
Authorization: Bearer <token>
```

### Get Payment Statistics
```
GET /api/v1/payments/stats?days=30
Authorization: Bearer <token>
```

## 🔄 Payment Flow

### Client-Side Flow:

1. **User clicks "Pay ₹X to Download"**
   ```javascript
   const response = await apiService.createPaymentOrder(fileId);
   const { paymentSessionId } = response.data;
   ```

2. **Cashfree Checkout Opens**
   ```javascript
   const cashfree = window.Cashfree({ mode: 'sandbox' });
   cashfree.checkout({
     paymentSessionId,
     returnUrl: `${window.location.origin}/payment/callback?orderId=${orderId}`,
   });
   ```

3. **User completes payment** in Cashfree modal

4. **Redirect to callback page** where payment is verified

### Server-Side Flow:

1. **Order Creation:**
   - Validate file and user
   - Calculate commission split
   - Create payment record in database
   - Create Cashfree order via API

2. **Webhook Processing:**
   - Cashfree sends webhook on payment success/failure
   - Backend verifies and updates payment status
   - File status updated to "delivered"
   - Trigger automatic payout (if configured)

3. **Payment Verification:**
   - Frontend polls `/payments/verify/:orderId`
   - Backend returns current payment status

4. **Download Access:**
   - `/files/:id/download` endpoint checks payment status
   - Only allows download if payment is completed
   - Creator can always download their own files

## 💰 Commission Split Logic

```javascript
const amount = file.price;  // e.g., ₹500
const platformCommission = amount * 0.10;  // ₹50 (10%)
const creatorShare = amount - platformCommission;  // ₹450 (90%)
```

Stored in Payment model:
```javascript
{
  amount: 500,
  platformCommission: 50,
  creatorShare: 450,
  payoutStatus: 'pending'
}
```

## 🔐 Webhook Configuration

### In Cashfree Dashboard:

1. Go to **Developers** > **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/v1/payments/webhook`
3. Select events:
   - `PAYMENT_SUCCESS_WEBHOOK`
   - `PAYMENT_FAILED_WEBHOOK`
   - `PAYMENT_USER_DROPPED_WEBHOOK`

### For Local Testing:

Use ngrok or similar tunneling service:
```bash
ngrok http 5000
# Use the ngrok URL in Cashfree webhook settings
```

## 🧪 Testing in Sandbox

### Test Payment Methods:

**UPI:**
- UPI ID: `success@paytm`
- Result: Successful payment

**Card:**
- Card Number: `4111 1111 1111 1111`
- CVV: `123`
- Expiry: Any future date
- Result: Successful payment

**Failed Payment:**
- UPI ID: `failure@paytm`
- Result: Failed payment

## 🚨 Common Issues & Solutions

### 1. "Payment service is currently unavailable"
- **Cause:** Missing Cashfree credentials
- **Solution:** Add `CASHFREE_CLIENT_ID` and `CASHFREE_CLIENT_SECRET` to `.env`

### 2. "Webhook signature verification failed"
- **Cause:** Webhook signature mismatch
- **Solution:** Currently webhooks are accepted without signature verification. For production, implement signature verification.

### 3. "CORS error" when opening checkout
- **Cause:** Cashfree SDK not loaded
- **Solution:** Ensure `<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>` is in `index.html`

### 4. Payment successful but file not accessible
- **Cause:** Webhook not received or processed
- **Solution:** Check backend logs, verify webhook URL in Cashfree dashboard

## 📊 Database Schema

### Payment Model:
```javascript
{
  fileId: String,
  creatorId: String,
  clientId: String,
  amount: Number,
  currency: String,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet',
  
  // Cashfree IDs
  cashfreeOrderId: String,
  cashfreePaymentId: String,
  transactionId: String,
  
  // Commission Split
  platformCommission: Number,
  creatorShare: Number,
  
  // Payout Tracking
  payoutStatus: 'pending' | 'processing' | 'completed' | 'failed',
  payoutId: String,
  payoutTransferId: String,
  payoutUtr: String,
  
  // Timestamps
  paidAt: Date,
  payoutAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔮 Future Enhancements

1. **Automatic Payouts:**
   - Integrate Cashfree Payouts API
   - Auto-transfer creator share to UPI/Bank account
   - Scheduled payouts (daily/weekly)

2. **Refund Support:**
   - Implement refund API
   - Automatic commission reversal

3. **Payment Links:**
   - Generate shareable payment links
   - No login required for clients

4. **Analytics Dashboard:**
   - Revenue graphs
   - Payment success rate
   - Top-selling files

## 📞 Support

- Cashfree Documentation: https://docs.cashfree.com
- Cashfree Support: support@cashfree.com
- UpLink Issues: [GitHub Issues]

## ✅ Checklist for Production

- [ ] Replace sandbox credentials with production credentials
- [ ] Change `CASHFREE_ENVIRONMENT=production` in `.env`
- [ ] Update frontend Cashfree mode to 'production'
- [ ] Configure production webhook URL in Cashfree dashboard
- [ ] Set up SSL certificate for webhook URL
- [ ] Complete Cashfree KYC verification
- [ ] Test with small amount in production
- [ ] Set up monitoring and alerts
- [ ] Configure automatic payouts
- [ ] Update `FRONTEND_URL` and `BACKEND_URL` to production URLs

---

**Happy Coding! 🎉**

