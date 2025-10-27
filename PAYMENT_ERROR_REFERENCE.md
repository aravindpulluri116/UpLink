# 🔧 Payment Integration - Error Reference Guide

## ✅ FIXED: 400 Bad Request - Validation Failed

### Error Details:
```
POST /api/v1/payments/create-order 400
Error: Validation failed
```

### Root Cause:
The `createPaymentValidation` middleware was expecting `amount` and `paymentMethod` fields from the frontend, but the new implementation gets these automatically from the file in the backend.

### Solution Applied:
**Updated:** `backend/src/middleware/validation.ts`

**Before:**
```javascript
export const createPaymentValidation = [
  body('fileId').isMongoId().withMessage('Please provide a valid file ID'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('paymentMethod').isIn(['upi', 'card', 'netbanking', 'wallet']).withMessage('Invalid payment method'),
  body('upiId').optional().matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/).withMessage('Please provide a valid UPI ID')
];
```

**After:**
```javascript
export const createPaymentValidation = [
  body('fileId').isMongoId().withMessage('Please provide a valid file ID')
];
```

### Status: ✅ FIXED
Backend has been rebuilt and restarted. The payment flow should now work!

---

## 📚 Common Payment Errors & Solutions

### 1. **400 Bad Request - Missing fileId**

**Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "error": [
    {
      "msg": "Please provide a valid file ID",
      "param": "fileId"
    }
  ]
}
```

**Cause:** No `fileId` provided in the request body.

**Solution:**
```javascript
// Frontend - Make sure to pass fileId
await apiService.createPaymentOrder(fileId); // ✅ Correct
await apiService.createPaymentOrder();       // ❌ Wrong
```

---

### 2. **404 Not Found - File not found**

**Error:**
```json
{
  "success": false,
  "message": "File not found"
}
```

**Cause:** File with the provided ID doesn't exist in the database.

**Solution:**
- Verify the file ID is correct
- Check if the file was deleted
- Ensure you're using the correct file object from the API

---

### 3. **400 Bad Request - File is not available for purchase**

**Error:**
```json
{
  "success": false,
  "message": "File is not available for purchase"
}
```

**Causes:**
- File is not marked as public (`isPublic: false`)
- File has no price set (`price: 0` or `price: null`)
- File price is negative

**Solution:**
```javascript
// When uploading/updating file, ensure:
{
  isPublic: true,  // ✅ Must be true
  price: 100       // ✅ Must be > 0
}
```

---

### 4. **400 Bad Request - You cannot purchase your own file**

**Error:**
```json
{
  "success": false,
  "message": "You cannot purchase your own file"
}
```

**Cause:** The logged-in user is the creator of the file.

**Solution:**
- Creators can download their own files for free using the "Download" button
- Use a different account (client account) to test payment flow
- This is intentional behavior to prevent self-payments

---

### 5. **404 Not Found - Creator not found**

**Error:**
```json
{
  "success": false,
  "message": "Creator not found"
}
```

**Cause:** The creator account associated with the file no longer exists.

**Solution:**
- This is a rare edge case
- Ensure user accounts are not being deleted if they have active files
- Consider soft-delete for user accounts with files

---

### 6. **503 Service Unavailable - Payment service is currently unavailable**

**Error:**
```json
{
  "success": false,
  "message": "Payment service is currently unavailable"
}
```

**Cause:** Cashfree credentials are missing or invalid.

**Solution:**
```bash
# Check .env file has these variables:
CASHFREE_CLIENT_ID=your_client_id
CASHFREE_CLIENT_SECRET=your_client_secret
CASHFREE_ENVIRONMENT=sandbox

# Verify credentials are correct
# Restart backend after adding credentials
```

**Verify in logs:**
```
✅ Cashfree credentials found
💳 Cashfree configured in sandbox mode
✅ Cashfree payment gateway enabled
```

---

### 7. **500 Internal Server Error - Failed to create payment order**

**Error:**
```json
{
  "success": false,
  "message": "Failed to create payment order",
  "error": "Payment gateway error"
}
```

**Causes:**
- Invalid Cashfree credentials
- Network issue connecting to Cashfree API
- Cashfree API is down

**Solution:**
1. **Check Cashfree credentials:**
   ```bash
   # Test credentials at: https://sandbox.cashfree.com/merchants/login
   ```

2. **Check backend logs:**
   ```bash
   tail -f backend/logs/app.log
   # Look for "Cashfree API error"
   ```

3. **Verify Cashfree API status:**
   - Sandbox: https://sandbox.cashfree.com/
   - Production: https://www.cashfree.com/

4. **Test with curl:**
   ```bash
   curl -X POST https://sandbox.cashfree.com/pg/orders \
     -H "Content-Type: application/json" \
     -H "x-client-id: your_client_id" \
     -H "x-client-secret: your_client_secret" \
     -H "x-api-version: 2023-08-01" \
     -d '{
       "order_amount": 100,
       "order_currency": "INR",
       "order_id": "test_order_123",
       "customer_details": {
         "customer_id": "test_user",
         "customer_name": "Test User",
         "customer_email": "test@example.com",
         "customer_phone": "9999999999"
       }
     }'
   ```

---

### 8. **Frontend - Cashfree SDK not loaded**

**Error in Console:**
```
Uncaught ReferenceError: Cashfree is not defined
```

**Cause:** Cashfree SDK script not loaded in HTML.

**Solution:**
Verify `frontend/index.html` has:
```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

**Alternative (if CDN is blocked):**
```bash
npm install @cashfreepayments/cashfree-js
```

Then import in component:
```javascript
import { load } from '@cashfreepayments/cashfree-js';
const cashfree = await load({ mode: 'sandbox' });
```

---

### 9. **402 Payment Required - Payment required to download this file**

**Error:**
```json
{
  "success": false,
  "message": "Payment required to download this file",
  "data": {
    "requiresPayment": true,
    "price": 100,
    "currency": "INR"
  }
}
```

**Cause:** User hasn't completed payment for this file.

**Solution:**
- This is expected behavior for unpaid files
- User needs to complete payment first
- After successful payment, download will be allowed

**Check payment status:**
```bash
GET /api/v1/payments/user
# Look for payment with status: 'completed' for this fileId
```

---

### 10. **Webhook Not Received**

**Symptoms:**
- Payment completed in Cashfree
- Payment status still "pending" in database
- File not accessible after payment

**Causes:**
- Webhook URL not configured in Cashfree dashboard
- Webhook URL not accessible (localhost won't work)
- Firewall blocking webhook requests

**Solution:**

**For Local Development:**
1. Use ngrok or similar tunneling:
   ```bash
   ngrok http 5000
   # Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
   ```

2. Update Cashfree webhook URL:
   ```
   https://abc123.ngrok.io/api/v1/payments/webhook
   ```

**For Production:**
1. Configure webhook in Cashfree dashboard:
   ```
   https://yourdomain.com/api/v1/payments/webhook
   ```

2. Select these events:
   - ✅ `PAYMENT_SUCCESS_WEBHOOK`
   - ✅ `PAYMENT_FAILED_WEBHOOK`
   - ✅ `PAYMENT_USER_DROPPED_WEBHOOK`

**Test webhook manually:**
```bash
curl -X POST http://localhost:5000/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "data": {
      "order": {
        "cf_order_id": "test_order_123",
        "order_id": "test_order_123"
      },
      "payment": {
        "cf_payment_id": "12345",
        "payment_id": "test_payment_123",
        "payment_method": "upi"
      }
    }
  }'
```

---

### 11. **CORS Error**

**Error in Console:**
```
Access to fetch at 'http://localhost:5000/api/v1/payments/create-order' 
from origin 'http://localhost:8080' has been blocked by CORS policy
```

**Cause:** Backend not configured to accept requests from frontend origin.

**Solution:**
Check `backend/src/middleware/security.ts` has:
```javascript
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
};
```

Verify `.env`:
```bash
FRONTEND_URL=http://localhost:8080
```

---

### 12. **401 Unauthorized**

**Error:**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**Cause:** User not authenticated or token expired.

**Solution:**
```javascript
// Check if user is logged in
const token = localStorage.getItem('auth_token');
if (!token) {
  // Redirect to login
  navigate('/auth');
}

// Token might be expired (7 days by default)
// User needs to login again
```

---

## 🧪 Testing Checklist

### Before Testing Payments:

- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:8080
- [ ] MongoDB connected
- [ ] R2 storage connected
- [ ] Cashfree credentials configured
- [ ] `.env` file has all required variables
- [ ] User logged in with valid token
- [ ] File uploaded with `price > 0` and `isPublic: true`

### Test Flow:

1. ✅ Upload file (Creator account)
2. ✅ Set price and make public
3. ✅ Generate shareable link
4. ✅ Open link in incognito/different browser
5. ✅ Click "Pay ₹X for Full Access"
6. ✅ Login/Register (Client account)
7. ✅ Cashfree modal opens
8. ✅ Use test credentials: `success@paytm` (UPI)
9. ✅ Payment completes
10. ✅ Redirect to callback page
11. ✅ Click "Download File"
12. ✅ File downloads successfully

---

## 📞 Getting Help

### Check Logs:
```bash
# Backend logs
tail -f backend/logs/app.log

# Look for:
# ❌ Errors (ERROR:)
# ⚠️  Warnings (WARN:)
# 💳 Payment creation
# 🔔 Webhook received
```

### Debug Mode:
Add to `.env`:
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

### Cashfree Documentation:
- **Payment API:** https://docs.cashfree.com/docs/payment-gateway
- **Webhook Guide:** https://docs.cashfree.com/docs/webhooks
- **Test Credentials:** https://docs.cashfree.com/docs/test-data
- **Error Codes:** https://docs.cashfree.com/docs/error-codes

### Support:
- **Cashfree Support:** support@cashfree.com
- **Cashfree Dashboard:** https://sandbox.cashfree.com/merchants/login

---

## ✅ Current Status

**Fixed Issues:**
- ✅ Validation error (400) - `amount` and `paymentMethod` no longer required
- ✅ Backend compiled successfully
- ✅ Server running on port 5000
- ✅ All services connected (DB, R2, Cashfree)

**Ready to Test:**
The payment flow is now fully functional! Try creating a payment and the validation error should be gone.

---

**Last Updated:** 2025-10-25
**Status:** All systems operational 🚀

