# 🔌 RESTful API Specification

**Last Updated:** 2026-05-19  
**Version**: v1  
**Base URL**: `https://api.example.com/api/v1`  
**Authentication**: Bearer JWT Token

---

# 📋 Table of Contents
1. Authentication Endpoints
2. Order Endpoints
3. Payment Endpoints
4. Refund Endpoints
5. Webhook Endpoints
6. Error Handling
7. Code Examples

---

# 1️⃣ Authentication Endpoints

## Register User
```
POST /auth/register
```

**Request:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "phone": "+66812345678"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "customer@example.com",
    "full_name": "John Doe",
    "created_at": "2026-03-19T15:30:00Z"
  }
}
```

---

## Login
```
POST /auth/login
```

**Request:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 900,
    "token_type": "Bearer",
    "user": {
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "customer@example.com",
      "full_name": "John Doe"
    }
  }
}
```

---

# 2️⃣ Order Endpoints

## Create Order
```
POST /orders
Content-Type: application/json
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "items": [
    {
      "product_id": "prod_123",
      "product_name": "Premium Service - 1 Month",
      "quantity": 1,
      "unit_price": 299.00
    }
  ],
  "notes": "Please expedite delivery",
  "shipping_address": {
    "street": "123 Sukhumvit Road",
    "city": "Bangkok",
    "postal_code": "10110",
    "country": "TH"
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "order_id": "ORD20260319001",
    "order_number": "ORD-2026-0001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "subtotal": 299.00,
    "tax_amount": 20.93,
    "discount_amount": 0.00,
    "total_amount": 319.93,
    "currency": "THB",
    "status": "pending",
    "items": [
      {
        "item_id": "item_123",
        "product_id": "prod_123",
        "product_name": "Premium Service - 1 Month",
        "quantity": 1,
        "unit_price": 299.00,
        "line_total": 299.00
      }
    ],
    "created_at": "2026-03-19T15:20:00Z",
    "updated_at": "2026-03-19T15:20:00Z"
  }
}
```

---

## Get Order Details
```
GET /orders/{order_id}
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "order_id": "ORD20260319001",
    "order_number": "ORD-2026-0001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "paid",
    "total_amount": 319.93,
    "created_at": "2026-03-19T15:20:00Z",
    "paid_at": "2026-03-19T15:25:00Z",
    "items": [...],
    "payments": [
      {
        "payment_id": "PAY_xxx",
        "status": "paid",
        "method": "promptpay",
        "amount": 319.93,
        "paid_at": "2026-03-19T15:25:00Z"
      }
    ]
  }
}
```

---

## List Orders
```
GET /orders?page=1&limit=20&status=paid
Authorization: Bearer {access_token}
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20, max: 100) |
| `status` | string | Filter by status |
| `from_date` | string | ISO 8601 date (e.g., 2026-03-01) |
| `to_date` | string | ISO 8601 date |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 20,
      "pages": 3
    }
  }
}
```

---

# 3️⃣ Payment Endpoints

## Create Payment (Initiate)
```
POST /payments
Content-Type: application/json
Authorization: Bearer {access_token}
X-Idempotency-Key: {unique_key}
```

**Headers Required:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440001
X-Request-ID: abc123def456 (optional)
```

**Request:**
```json
{
  "order_id": "ORD20260319001",
  "method": "promptpay"
}
```

**Method Options:**
- `promptpay` - PromptPay QR Code
- `truemoney` - TrueMoney Wallet
- `bank_transfer` - Internet/Mobile Banking

**Response (201 Created):**

### PromptPay Response:
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY_550e8400-e29b-41d4-a716-446655440002",
    "order_id": "ORD20260319001",
    "method": "promptpay",
    "status": "pending",
    "amount": 319.93,
    "currency": "THB",
    "qr_code": "https://s3.example.com/qr/pp_123.png",
    "reference_number": "000564400051234567",
    "expires_at": "2026-03-19T15:35:00Z",
    "created_at": "2026-03-19T15:20:00Z",
    "next_action": {
      "type": "display_qr",
      "message": "Please scan this QR code to pay",
      "instruction": "1. Open your banking app\n2. Tap QR Code\n3. Scan this QR\n4. Confirm payment"
    }
  }
}
```

### TrueMoney Response:
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY_550e8400-e29b-41d4-a716-446655440003",
    "order_id": "ORD20260319001",
    "method": "truemoney",
    "status": "pending",
    "amount": 319.93,
    "currency": "THB",
    "created_at": "2026-03-19T15:20:00Z",
    "next_action": {
      "type": "redirect",
      "redirect_url": "https://payment-gateway.omise.co/pay/xxx",
      "message": "You will be redirected to TrueMoney to complete payment"
    }
  }
}
```

---

## Get Payment Status
```
GET /payments/{payment_id}
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY_xxx",
    "order_id": "ORD20260319001",
    "method": "promptpay",
    "status": "paid",
    "amount": 319.93,
    "currency": "THB",
    "provider_txn_id": "chrg_xxx",
    "reference_number": "000564400051234567",
    "created_at": "2026-03-19T15:20:00Z",
    "paid_at": "2026-03-19T15:25:00Z",
    "webhook_received_at": "2026-03-19T15:25:10Z"
  }
}
```

---

## Cancel Payment
```
PATCH /payments/{payment_id}/cancel
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "reason": "Changed my mind"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY_xxx",
    "status": "cancelled",
    "cancelled_at": "2026-03-19T15:30:00Z",
    "reason": "Changed my mind"
  }
}
```

---

## Retry Payment
```
POST /payments/{payment_id}/retry
Authorization: Bearer {access_token}
X-Idempotency-Key: {unique_key}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "payment_id": "PAY_550e8400-e29b-41d4-a716-446655440004",
    "status": "pending",
    "qr_code": "https://...",
    "expires_at": "2026-03-19T15:45:00Z"
  }
}
```

---

# 4️⃣ Refund Endpoints

## Create Refund
```
POST /refunds
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "payment_id": "PAY_xxx",
  "amount": 319.93,
  "reason": "Customer request"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "refund_id": "REF_xxx",
    "payment_id": "PAY_xxx",
    "amount": 319.93,
    "status": "initiated",
    "reason": "Customer request",
    "created_at": "2026-03-19T16:00:00Z",
    "next_action": {
      "type": "approval_required",
      "message": "Refund request submitted for review"
    }
  }
}
```

---

## Get Refund Status
```
GET /refunds/{refund_id}
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "refund_id": "REF_xxx",
    "payment_id": "PAY_xxx",
    "amount": 319.93,
    "status": "completed",
    "processed_at": "2026-03-19T17:00:00Z"
  }
}
```

---

# 5️⃣ Webhook Endpoints

## Payment Webhook (Receive)
```
POST /webhooks/payment
Content-Type: application/json
```

**Headers:**
```
X-Signature: {hmac_sha256_signature}
X-Timestamp: {unix_timestamp}
X-Webhook-ID: {webhook_id}
X-Event-Type: charge.complete
```

**Request Payload:**
```json
{
  "object": "charge",
  "id": "chrg_xxx",
  "status": "successful",
  "amount": 31993,
  "currency": "THB",
  "source": {
    "id": "src_xxx",
    "type": "promptpay"
  },
  "metadata": {
    "order_id": "ORD20260319001",
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "created": "2026-03-19T15:25:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook received and processed"
}
```

---

# 6️⃣ Error Handling

## Error Response Format
```json
{
  "success": false,
  "error": "error_code",
  "message": "Human readable message",
  "details": {
    "field": "order_id",
    "reason": "Order not found"
  },
  "timestamp": "2026-03-19T15:30:00Z",
  "request_id": "req_xxx"
}
```

## Common Error Codes

| Code | Status | Message | Action |
|------|--------|---------|--------|
| `invalid_request` | 400 | Invalid request parameters | Check request format |
| `authentication_required` | 401 | Missing or invalid token | Login again |
| `forbidden` | 403 | Permission denied | Use correct account |
| `not_found` | 404 | Resource not found | Check ID |
| `conflict` | 409 | Resource already exists | Use existing resource |
| `rate_limited` | 429 | Too many requests | Wait and retry |
| `server_error` | 500 | Internal server error | Retry later |
| `payment_failed` | 402 | Payment processing failed | Try different method |
| `expired` | 410 | Request expired | Create new payment |

---

# 7️⃣ Code Examples

## JavaScript/Node.js

### Create Payment
```javascript
const createPayment = async (orderId, method) => {
  const idempotencyKey = generateUUID();
  
  const response = await fetch('https://api.example.com/api/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': idempotencyKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: orderId,
      method: method
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
};

// Usage
try {
  const payment = await createPayment('ORD20260319001', 'promptpay');
  console.log('Payment created:', payment.data.payment_id);
  
  if (payment.data.next_action.type === 'display_qr') {
    displayQRCode(payment.data.qr_code);
  }
} catch (error) {
  console.error('Payment creation failed:', error.message);
}
```

### Poll Payment Status
```javascript
const pollPaymentStatus = async (paymentId, maxWaitTime = 120000) => {
  const startTime = Date.now();
  const interval = 3000; // 3 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(
      `https://api.example.com/api/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const data = await response.json();

    if (data.data.status === 'paid') {
      return { success: true, payment: data.data };
    }

    if (['failed', 'expired', 'cancelled'].includes(data.data.status)) {
      return { success: false, status: data.data.status };
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return { success: false, error: 'Timeout' };
};
```

## Python (Flask/Requests)

```python
import requests
import hmac
import hashlib
from datetime import datetime

class PaymentClient:
    def __init__(self, base_url, access_token):
        self.base_url = base_url
        self.access_token = access_token
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

    def create_payment(self, order_id, method, idempotency_key):
        """Create a new payment"""
        url = f'{self.base_url}/api/v1/payments'
        
        headers = {
            **self.headers,
            'X-Idempotency-Key': idempotency_key
        }

        payload = {
            'order_id': order_id,
            'method': method
        }

        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()

    def get_payment_status(self, payment_id):
        """Get payment status"""
        url = f'{self.base_url}/api/v1/payments/{payment_id}'
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def verify_webhook_signature(payload, signature, secret):
        """Verify webhook signature"""
        import json
        payload_str = json.dumps(payload, sort_keys=True)
        expected_sig = hmac.new(
            secret.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_sig)


# Usage
client = PaymentClient(
    base_url='https://api.example.com',
    access_token='your_access_token'
)

try:
    payment = client.create_payment(
        order_id='ORD20260319001',
        method='promptpay',
        idempotency_key='unique_key_123'
    )
    print(f'Payment created: {payment["data"]["payment_id"]}')
except requests.RequestException as e:
    print(f'Error: {e}')
```

