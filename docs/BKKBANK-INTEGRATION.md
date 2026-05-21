# Bangkok Bank Payment Integration Guide

## Overview

This guide covers the real Bangkok Bank API integration for the payment system. Replace all mock data with actual Bangkok Bank payment processing.

## Features Supported

✅ **PromptPay QR** - Direct QR code generation  
✅ **Credit Card** - Redirect to payment gateway  
✅ **Bank Transfer** - Internet Banking redirect  
✅ **Webhook Processing** - Real-time payment confirmation  
✅ **Refunds** - Full and partial refunds  
✅ **Reconciliation** - Daily transaction reconciliation  

---

## Setup Instructions

### 1. Get Bangkok Bank Credentials

Contact Bangkok Bank Developer Relations:
- Website: https://developer.bangkokbank.com/
- Email: developer@bangkokbank.com
- Business Portal: https://www.bangkokbank.com/en/Business-Banking

You will receive:
- **Merchant ID**
- **API Key**
- **API Secret**
- **Sandbox URL** (for testing)
- **Production URL** (for live)

### 2. Configure Environment Variables

```bash
# Copy example
cp .env.example .env

# Edit with your credentials
nano .env
```

Add Bangkok Bank credentials:

```env
BKKBANK_API_URL=https://api.sandbox.bangkokbank.com/v1
BKKBANK_MERCHANT_ID=BBK_MERCHANT_12345
BKKBANK_API_KEY=sk_test_xxxxxxxxxxxxx
BKKBANK_SECRET=secret_xxxxxxxxxxxxx
```

### 3. Install Dependencies

```bash
npm install axios uuid
```

### 4. Update Server Configuration

In `src/index.js` or `src/app.js`:

```javascript
const bkkbankRoutes = require('./routes/bkkbankPayments');

// Register routes
app.use('/api/v1/payments/bkkbank', bkkbankRoutes);
app.use('/api/v1/webhooks/bkkbank', bkkbankRoutes);
```

### 5. Database Migration

Create new migration for Bangkok Bank fields:

```bash
npm run migrate:create add_bkkbank_fields
```

Add to migration file:

```sql
ALTER TABLE payments ADD COLUMN gateway VARCHAR(50);
ALTER TABLE payments ADD COLUMN transaction_id VARCHAR(100);
ALTER TABLE payments ADD COLUMN reference_number VARCHAR(100);
ALTER TABLE payments ADD COLUMN qr_code TEXT;
ALTER TABLE payments ADD COLUMN qr_image TEXT;
ALTER TABLE payments ADD COLUMN bank_details JSONB;
ALTER TABLE payments ADD COLUMN raw_response JSONB;

CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
CREATE INDEX idx_payments_gateway ON payments(gateway);
```

Run migration:

```bash
npm run migrate:up
```

---

## API Endpoints

### Create PromptPay QR Payment

**POST** `/api/v1/payments/bkkbank/promptpay`

Request:
```json
{
  "orderId": "ORD-20260521-001",
  "customerId": "CUST-12345"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY-xxxxx",
    "transaction_id": "TXN-bkkbank-xxxxx",
    "qr_code": "00020101021129370016com.bangkokbank...",
    "qr_image": "data:image/png;base64,...",
    "reference_number": "REF-2025052100001",
    "expires_at": "2025-05-21T11:30:00Z",
    "method": "promptpay_qr",
    "next_action": {
      "type": "display_qr",
      "message": "Please scan this QR code with your mobile banking app"
    }
  }
}
```

### Create Credit Card Payment

**POST** `/api/v1/payments/bkkbank/credit-card`

Request:
```json
{
  "orderId": "ORD-20260521-001",
  "customerId": "CUST-12345"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY-xxxxx",
    "transaction_id": "TXN-bkkbank-xxxxx",
    "method": "credit_card",
    "next_action": {
      "type": "redirect",
      "redirect_url": "https://api.bangkokbank.com/checkout/xxxxx"
    }
  }
}
```

### Create Bank Transfer Payment

**POST** `/api/v1/payments/bkkbank/bank-transfer`

Request:
```json
{
  "orderId": "ORD-20260521-001",
  "customerId": "CUST-12345"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY-xxxxx",
    "transaction_id": "TXN-bkkbank-xxxxx",
    "method": "bank_transfer",
    "bank_details": {
      "account_name": "Your Company Ltd",
      "account_number": "xxx-x-xxxxx-x",
      "bank_name": "Bangkok Bank",
      "branch": "Headquarters",
      "amount": 1500.00,
      "reference": "ORD-20260521-001"
    },
    "next_action": {
      "type": "display_info",
      "message": "Transfer to the account details shown"
    }
  }
}
```

### Check Payment Status

**GET** `/api/v1/payments/bkkbank/{transactionId}/status`

Response:
```json
{
  "success": true,
  "data": {
    "transactionId": "TXN-bkkbank-xxxxx",
    "orderId": "ORD-20260521-001",
    "status": "COMPLETED",
    "amount": 1500.00,
    "currency": "THB",
    "paymentMethod": "PROMPTPAY_QR",
    "referenceNumber": "REF-2025052100001",
    "completedAt": "2025-05-21T10:45:30Z"
  }
}
```

### Create Refund

**POST** `/api/v1/payments/bkkbank/{transactionId}/refund`

Request:
```json
{
  "amount": 500.00,
  "reason": "Customer requested refund"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "refund_id": "REF-bkkbank-xxxxx",
    "transaction_id": "TXN-bkkbank-xxxxx",
    "amount": 500.00,
    "status": "PENDING"
  }
}
```

---

## Webhook Integration

### Setup Webhook URL

In Bangkok Bank Dashboard:
1. Go to Settings → Webhooks
2. Add webhook URL: `https://api.yourapp.com/api/v1/webhooks/bkkbank/payment`
3. Select events: `payment.completed`, `payment.failed`, `payment.cancelled`

### Webhook Signature Verification

Bangkok Bank sends requests with:
- `X-Signature`: HMAC-SHA256 signature
- `X-Timestamp`: Request timestamp

The service automatically verifies:
```javascript
// Verification is done automatically in BangkokBankService.verifyWebhookSignature()
// Headers: X-Signature, X-Timestamp
// Timestamp must be within 5 minutes
```

### Example Webhook Payload

```json
{
  "transactionId": "TXN-bkkbank-xxxxx",
  "orderId": "ORD-20260521-001",
  "status": "COMPLETED",
  "amount": 1500.00,
  "currency": "THB",
  "paymentMethod": "PROMPTPAY_QR",
  "referenceNumber": "REF-2025052100001",
  "completedAt": "2025-05-21T10:45:30Z"
}
```

---

## Testing

### Sandbox Testing

1. Use sandbox API URL:
```
BKKBANK_API_URL=https://api.sandbox.bangkokbank.com/v1
```

2. Test PromptPay QR:
   - Use test QR generator
   - Scan with Bangkok Bank mobile app in sandbox mode

3. Test Credit Card:
   - Use test card: `4111 1111 1111 1111`
   - Any future expiry date
   - Any 3-digit CVC

4. Test Bank Transfer:
   - Use test account for transfers

### Using Postman

1. Import collection: `postman/BangkokBank-API.json`
2. Set environment variables:
   - `{{base_url}}` = `http://localhost:3000`
   - `{{auth_token}}` = Your JWT token
   - `{{transaction_id}}` = Transaction ID from payment creation

### Unit Tests

```bash
# Run payment tests
npm test -- tests/unit/services/BangkokBankService.test.js

# Run controller tests
npm test -- tests/controllers/BangkokBankPaymentController.test.js

# Integration tests
npm test -- tests/integration/bkkbank-payments.test.js
```

---

## Error Handling

### Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `INVALID_MERCHANT` | Bad credentials | Check credentials in .env |
| `INVALID_AMOUNT` | Amount format wrong | Use number format with 2 decimals |
| `TRANSACTION_EXPIRED` | QR code expired | Create new payment |
| `DUPLICATE_REQUEST` | Same request sent twice | Use idempotency keys |
| `PAYMENT_FAILED` | Payment declined | Allow user to retry |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Implement exponential backoff |

### Error Response Format

```json
{
  "success": false,
  "error": "User-friendly error message",
  "errorCode": "ERROR_CODE",
  "details": {
    "transactionId": "TXN-xxxxx",
    "timestamp": "2025-05-21T10:45:30Z"
  }
}
```

---

## Security Checklist

Before going to production:

- [ ] SSL/TLS certificate installed
- [ ] Environment variables configured securely
- [ ] Webhook signature verification enabled
- [ ] Rate limiting implemented
- [ ] Request logging enabled (no sensitive data)
- [ ] Error tracking (Sentry) configured
- [ ] Database backup strategy in place
- [ ] Idempotency keys implemented
- [ ] Audit logging for all payment operations
- [ ] Regular security audits scheduled

---

## Production Deployment

### 1. Switch to Production URL

```env
# Change from sandbox
BKKBANK_API_URL=https://api.bangkokbank.com/v1
```

### 2. Request Production Credentials

Contact Bangkok Bank with:
- Company information
- Business registration
- Expected transaction volume
- Security audit report

### 3. Load Testing

```bash
npm run test:load -- --requests=1000 --concurrent=50
```

### 4. Staged Rollout

1. Deploy to staging environment
2. Run full test suite
3. Run production load tests (with Bangkok Bank approval)
4. Deploy to 10% of users
5. Monitor error rates and transaction success
6. Gradual increase to 100%

### 5. Monitoring & Alerts

Setup alerts for:
- Payment success rate < 95%
- Webhook latency > 5 seconds
- Failed refund attempts
- Reconciliation discrepancies
- API error rates > 1%

---

## Reconciliation

### Daily Reconciliation

```bash
# Run manually
npm run reconcile:daily

# Or with cron (recommended)
# 0 2 * * * npm run reconcile:daily
```

### Check Discrepancies

```javascript
const reconciliationService = require('./services/reconciliation');
const report = await reconciliationService.runDailyReconciliation(
  new Date('2025-05-21'),
  new Date('2025-05-22')
);
```

### Resolve Discrepancies

1. Review `payment_reconciliation_logs` table
2. Check Bangkok Bank transaction report
3. Update manual records if needed
4. Alert admin if amount mismatch > 1%

---

## Support & Resources

- Bangkok Bank Developer Portal: https://developer.bangkokbank.com/
- API Documentation: https://developer.bangkokbank.com/docs/
- Sandbox Testing: https://sandbox.bangkokbank.com/
- Support Email: developer-support@bangkokbank.com
- Your Implementation Guide: `/docs/payment-system/`

---

## FAQ

**Q: What if webhook doesn't arrive?**  
A: Frontend polls payment status every 3 seconds as fallback. Check webhook logs in dashboard.

**Q: Can I test with real bank account?**  
A: No, use sandbox credentials first. Request production access from Bangkok Bank.

**Q: How long does PromptPay QR last?**  
A: Default 15 minutes. User must complete payment within this time.

**Q: What's the minimum/maximum transaction amount?**  
A: Depends on Bangkok Bank settings. Default: 1 THB - 5,000,000 THB.

**Q: Can I process partial refunds?**  
A: Yes, specify the `amount` parameter. Full refund if omitted.

**Q: How do I handle concurrent payments?**  
A: Each payment gets unique `transactionId`. Use Redis for idempotency.

---

## Changelog

### v1.0.0 (2025-05-21)
- Initial Bangkok Bank integration
- PromptPay QR support
- Credit Card payment support
- Bank Transfer support
- Webhook processing
- Refund handling
