# 💻 Implementation Guide - Backend Setup

**Last Updated:** 2026-05-19  
**Target Stack:** Node.js/Express, PostgreSQL

---

# 📦 Project Setup

## Prerequisites

```bash
# Required
- Node.js 16+
- PostgreSQL 13+
- npm or yarn
- Git

# Recommended
- Docker & Docker Compose
- Postman / REST Client
- pgAdmin (Database GUI)
```

---

# 🚀 Step 1: Project Initialization

## Create Project Structure

```bash
mkdir payment-system
cd payment-system

# Initialize Node.js project
npm init -y

# Create directory structure
mkdir -p src/{controllers,services,models,routes,middleware,utils,config}
mkdir -p tests/{unit,integration}
mkdir -p database/{migrations,seeds}
mkdir -p docs
touch .env.example .gitignore README.md
```

## Install Dependencies

```bash
# Core dependencies
npm install express dotenv cors helmet
npm install pg pg-promise
npm install jsonwebtoken bcryptjs
npm install uuid
npm install joi # validation

# Security
npm install express-rate-limit
npm install csrf

# Logging
npm install winston
npm install express-request-logger

# Testing
npm install --save-dev jest supertest
npm install --save-dev eslint prettier

# Development
npm install --save-dev nodemon
```

## Package.json Scripts

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "migrate": "node database/migrate.js",
    "seed": "node database/seed.js"
  }
}
```

---

# 🗄️ Step 2: Database Setup

## Environment Variables

Create `.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/payment_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_db
DB_USER=postgres
DB_PASSWORD=secure_password

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=24h

# Payment Gateway
OMISE_SECRET_KEY=skey_xxx
OMISE_PUBLIC_KEY=pkey_xxx

# Webhook
WEBHOOK_SECRET=webhook_secret_key

# Security
CSRF_SECRET=csrf_secret_key

# Logging
LOG_LEVEL=info
```

## Database Connection

Create `src/config/database.js`:

```javascript
const pgPromise = require('pg-promise');
const dotenv = require('dotenv');

dotenv.config();

const pgp = pgPromise({
  capSQL: true,
  error: (err, e) => {
    console.error('Database error:', err);
  }
});

const connection = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const db = pgp(connection);

// Test connection
db.connect()
  .then(obj => {
    console.log('✅ Connected to database');
    obj.done();
  })
  .catch(err => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });

module.exports = db;
```

## Run Migrations

Create `database/migrations/001-init.sql`:

```sql
-- Copy schema from 02-DATABASE-SCHEMA.md here
```

Run migrations:

```bash
psql -U postgres -d payment_db -f database/migrations/001-init.sql
```

---

# 🎯 Step 3: Core Models & Services

## Order Model

Create `src/models/Order.js`:

```javascript
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Order {
  static async create(data) {
    const orderId = uuidv4();
    
    const query = `
      INSERT INTO orders (
        order_id, user_id, subtotal, tax_amount, 
        discount_amount, total_amount, status, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      )
      RETURNING *
    `;
    
    return db.one(query, [
      orderId,
      data.user_id,
      data.subtotal,
      data.tax_amount || 0,
      data.discount_amount || 0,
      data.total_amount,
      'pending',
      data.notes
    ]);
  }

  static async findById(orderId) {
    const query = 'SELECT * FROM orders WHERE order_id = $1';
    return db.oneOrNone(query, [orderId]);
  }

  static async updateStatus(orderId, status) {
    const query = `
      UPDATE orders 
      SET status = $1, updated_at = NOW()
      WHERE order_id = $2
      RETURNING *
    `;
    return db.one(query, [status, orderId]);
  }
}

module.exports = Order;
```

## Payment Model

Create `src/models/Payment.js`:

```javascript
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Payment {
  static async create(data) {
    const paymentId = uuidv4();
    
    const query = `
      INSERT INTO payments (
        payment_id, order_id, method, provider,
        amount, currency, status, idempotency_key,
        qr_code, reference_number, expired_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      RETURNING *
    `;
    
    return db.one(query, [
      paymentId,
      data.order_id,
      data.method,
      data.provider,
      data.amount,
      data.currency || 'THB',
      'initiated',
      data.idempotency_key,
      data.qr_code,
      data.reference_number,
      data.expired_at
    ]);
  }

  static async findById(paymentId) {
    const query = 'SELECT * FROM payments WHERE payment_id = $1';
    return db.oneOrNone(query, [paymentId]);
  }

  static async findByIdempotencyKey(key) {
    const query = `
      SELECT * FROM payments 
      WHERE idempotency_key = $1 
      AND created_at > NOW() - INTERVAL '24 hours'
    `;
    return db.oneOrNone(query, [key]);
  }

  static async updateStatus(paymentId, status) {
    const query = `
      UPDATE payments 
      SET status = $1, updated_at = NOW()
      WHERE payment_id = $2
      RETURNING *
    `;
    return db.one(query, [status, paymentId]);
  }

  static async markAsPaid(paymentId, providerTxnId, webhookTime) {
    const query = `
      UPDATE payments 
      SET 
        status = 'paid',
        provider_txn_id = $2,
        paid_at = NOW(),
        webhook_received_at = $3,
        updated_at = NOW()
      WHERE payment_id = $1
      RETURNING *
    `;
    return db.one(query, [paymentId, providerTxnId, webhookTime]);
  }
}

module.exports = Payment;
```

## Payment Service

Create `src/services/PaymentService.js`:

```javascript
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const PaymentLog = require('../models/PaymentLog');
const OmiseService = require('./providers/OmiseService');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class PaymentService {
  /**
   * Create a new payment
   */
  static async createPayment(orderId, method, userId) {
    // 1. Validate order
    const order = await Order.findById(orderId);
    if (!order || order.status !== 'pending') {
      throw new Error('Order not found or already paid');
    }

    // 2. Generate idempotency key
    const idempotencyKey = crypto
      .createHash('sha256')
      .update(`${userId}:${orderId}:${Date.now()}`)
      .digest('hex');

    // 3. Check if already processing
    const existingPayment = await Payment.findByIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      return existingPayment;
    }

    // 4. Create payment based on method
    let paymentData = {
      order_id: orderId,
      method,
      amount: order.total_amount,
      currency: 'THB',
      idempotency_key: idempotencyKey,
      provider: 'omise'
    };

    if (method === 'promptpay') {
      return await this.createPromptPayPayment(paymentData, order);
    } else if (method === 'truemoney') {
      return await this.createTrueMoneyPayment(paymentData, order);
    } else if (method === 'bank_transfer') {
      return await this.createBankPayment(paymentData, order);
    }

    throw new Error('Invalid payment method');
  }

  /**
   * Create PromptPay QR payment
   */
  static async createPromptPayPayment(paymentData, order) {
    try {
      // Call Omise API to create PromptPay charge
      const omiseResponse = await OmiseService.createPromptPayCharge({
        amount: Math.round(order.total_amount * 100), // Convert to satang
        currency: 'THB',
        description: `Order ${order.order_id}`,
        metadata: {
          order_id: order.order_id,
          user_id: order.user_id
        }
      });

      // Extract QR code
      const qrCode = omiseResponse.source.scannable_code.image.download_uri;
      const reference = omiseResponse.source.reference_code;
      const expiredAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Save payment
      paymentData.qr_code = qrCode;
      paymentData.reference_number = reference;
      paymentData.expired_at = expiredAt;

      const payment = await Payment.create(paymentData);

      // Log the creation
      await PaymentLog.create({
        payment_id: payment.payment_id,
        event_type: 'created',
        description: 'PromptPay payment created',
        request_payload: { ...paymentData, amount: order.total_amount },
        response_payload: omiseResponse
      });

      return {
        payment_id: payment.payment_id,
        method: 'promptpay',
        status: payment.status,
        amount: order.total_amount,
        qr_code: qrCode,
        reference_number: reference,
        expired_at: expiredAt,
        next_action: {
          type: 'display_qr',
          message: 'Please scan this QR code to pay'
        }
      };
    } catch (error) {
      console.error('PromptPay creation error:', error);
      throw error;
    }
  }

  /**
   * Create TrueMoney payment
   */
  static async createTrueMoneyPayment(paymentData, order) {
    try {
      // Call Omise API to create TrueMoney redirect
      const omiseResponse = await OmiseService.createTrueMoneyCharge({
        amount: Math.round(order.total_amount * 100),
        currency: 'THB',
        return_uri: `${process.env.APP_URL}/checkout/success`,
        metadata: {
          order_id: order.order_id,
          user_id: order.user_id
        }
      });

      paymentData.redirect_url = omiseResponse.authorize_uri;

      const payment = await Payment.create(paymentData);

      await PaymentLog.create({
        payment_id: payment.payment_id,
        event_type: 'created',
        description: 'TrueMoney payment created',
        response_payload: omiseResponse
      });

      return {
        payment_id: payment.payment_id,
        method: 'truemoney',
        status: payment.status,
        next_action: {
          type: 'redirect',
          redirect_url: omiseResponse.authorize_uri
        }
      };
    } catch (error) {
      console.error('TrueMoney creation error:', error);
      throw error;
    }
  }

  /**
   * Create Bank payment
   */
  static async createBankPayment(paymentData, order) {
    // Similar to TrueMoney
    // Redirect to bank payment gateway
    try {
      const omiseResponse = await OmiseService.createBankCharge({
        amount: Math.round(order.total_amount * 100),
        currency: 'THB',
        return_uri: `${process.env.APP_URL}/checkout/success`,
        metadata: { order_id: order.order_id }
      });

      paymentData.redirect_url = omiseResponse.authorize_uri;
      const payment = await Payment.create(paymentData);

      return {
        payment_id: payment.payment_id,
        method: 'bank_transfer',
        status: payment.status,
        next_action: {
          type: 'redirect',
          redirect_url: omiseResponse.authorize_uri
        }
      };
    } catch (error) {
      console.error('Bank payment creation error:', error);
      throw error;
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId) {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }
    return payment;
  }
}

module.exports = PaymentService;
```

---

# 🔗 Step 4: API Routes

Create `src/routes/payments.js`:

```javascript
const express = require('express');
const router = express.Router();
const PaymentService = require('../services/PaymentService');
const authenticateToken = require('../middleware/auth');
const validateRequest = require('../middleware/validation');
const rateLimit = require('express-rate-limit');

// Rate limiter for payment creation
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10
});

/**
 * POST /api/v1/payments
 * Create a new payment
 */
router.post('/', authenticateToken, paymentLimiter, async (req, res) => {
  try {
    const { order_id, method } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Missing X-Idempotency-Key header'
      });
    }

    const payment = await PaymentService.createPayment(
      order_id,
      method,
      req.user.user_id
    );

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/payments/:payment_id
 * Get payment status
 */
router.get('/:payment_id', authenticateToken, async (req, res) => {
  try {
    const payment = await PaymentService.getPaymentStatus(
      req.params.payment_id
    );

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
```

---

# 🪝 Step 5: Webhook Handler

Create `src/routes/webhooks.js`:

```javascript
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const PaymentLog = require('../models/PaymentLog');
const NotificationService = require('../services/NotificationService');

/**
 * POST /api/v1/webhooks/payment
 * Receive webhook from payment provider
 */
router.post('/payment', async (req, res) => {
  try {
    // 1. Verify signature
    const signature = req.headers['x-signature'];
    const isValid = verifyWebhookSignature(
      req.body,
      signature,
      process.env.WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error('Invalid webhook signature');
      await logWebhookError(req.body, 'Invalid signature');
      return res.status(200).json({ error: 'Invalid signature' });
    }

    // 2. Parse webhook
    const { event, data } = req.body;
    console.log(`Processing webhook event: ${event}`);

    // 3. Get payment
    const payment = await Payment.findById(data.payment_id);
    if (!payment) {
      console.error(`Payment not found: ${data.payment_id}`);
      return res.status(200).json({ error: 'Payment not found' });
    }

    // 4. Verify amount
    const order = await Order.findById(payment.order_id);
    if (Math.abs(order.total_amount - (data.amount / 100)) > 0.01) {
      console.error('Amount mismatch');
      await logWebhookError(req.body, 'Amount mismatch');
      return res.status(200).json({ error: 'Amount mismatch' });
    }

    // 5. Handle different events
    if (event === 'payment.completed' || event === 'charge.complete') {
      await handlePaymentCompleted(payment, data);
    } else if (event === 'payment.failed' || event === 'charge.failed') {
      await handlePaymentFailed(payment, data);
    }

    // 6. Log webhook
    await PaymentLog.create({
      payment_id: payment.payment_id,
      event_type: 'webhook_received',
      webhook_payload: req.body,
      signature_verified: true
    });

    // 7. Always return 200 OK for reliability
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    await logWebhookError(req.body, error.message);
    res.status(200).json({ error: error.message }); // Still 200!
  }
});

/**
 * Handle successful payment
 */
async function handlePaymentCompleted(payment, webhookData) {
  // Update payment
  await Payment.markAsPaid(
    payment.payment_id,
    webhookData.provider_txn_id,
    new Date(webhookData.timestamp)
  );

  // Update order
  await Order.updateStatus(payment.order_id, 'paid');

  // Send notifications
  await NotificationService.sendPaymentConfirmation(
    payment.payment_id,
    payment.order_id
  );

  console.log(`Payment confirmed: ${payment.payment_id}`);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(payment, webhookData) {
  await Payment.updateStatus(payment.payment_id, 'failed');
  
  // Send failure notification
  await NotificationService.sendPaymentFailed(
    payment.payment_id,
    payment.order_id
  );

  console.log(`Payment failed: ${payment.payment_id}`);
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hmac)
  );
}

/**
 * Log webhook errors
 */
async function logWebhookError(payload, error) {
  console.error('Webhook error logged:', {
    payload,
    error,
    timestamp: new Date()
  });
  // Could save to database for debugging
}

module.exports = router;
```

---

# 🔐 Step 6: Middleware

Create `src/middleware/auth.js`:

```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authenticateToken;
```

---

# 🚀 Step 7: Main Application

Create `src/index.js`:

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes/payments');
const webhookRoutes = require('./routes/webhooks');

dotenv.config();

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
```

---

# 🧪 Step 8: Testing

Create `tests/integration/payments.test.js`:

```javascript
const request = require('supertest');
const app = require('../../src/index');

describe('Payment API', () => {
  let token;
  let orderId;

  beforeAll(() => {
    // Generate test JWT token
    token = generateTestToken();
  });

  test('POST /payments should create a payment', async () => {
    const response = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Idempotency-Key', 'test-key-123')
      .send({
        order_id: orderId,
        method: 'promptpay'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.payment_id).toBeDefined();
  });

  test('GET /payments/:id should return payment status', async () => {
    const response = await request(app)
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBeDefined();
  });
});

function generateTestToken() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { user_id: 'test-user-123' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}
```

---

# 🔜 Next Steps

1. ✅ Complete basic setup
2. 🔜 Implement Payment Gateway integration (Omise/2C2P)
3. 🔜 Add comprehensive error handling
4. 🔜 Implement logging service
5. 🔜 Add monitoring & alerting
6. 🔜 Security audit & penetration testing
7. 🔜 Deploy to staging
8. 🔜 Deploy to production

---

# 📚 References

- [Express.js Documentation](https://expressjs.com/)
- [Node.js PostgreSQL Tutorial](https://node-postgres.com/)
- [JWT Authentication](https://jwt.io/)

