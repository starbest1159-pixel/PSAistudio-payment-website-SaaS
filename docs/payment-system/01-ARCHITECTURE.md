# 🏗️ System Architecture & Design

**Last Updated:** 2026-05-19  
**Version:** 1.0  
**Status:** Production-Ready

---

# 📊 System Overview

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      Client Layer                               │
├─────────────────────────────────────────────────────────────────┤
│  Web Browser (React/Vue)  │  Mobile App (React Native/Flutter)  │
└────────────────┬──────────────────────────────────────┬─────────┘
                 │                                      │
                 └──────────────┬───────────────────────┘
                                │
                    HTTPS (TLS 1.3) + CORS
                                │
                ┌───────────────▼────────────────┐
                │    API Gateway / Load Balancer │
                │  - Rate Limiting (100 req/min) │
                │  - Request Validation          │
                │  - CORS Policy                 │
                └───────────────┬────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
    ┌─────────┐           ┌──────────┐           ┌──────────┐
    │ Auth    │           │Order     │           │Payment   │
    │Service  │           │Service   │           │Service   │
    └────┬────┘           └────┬─────┘           └────┬─────┘
         │                     │                      │
         └─────────────────────┼──────────────────────┘
                               │
               ┌───────────────▼────────────────┐
               │      PostgreSQL Database       │
               │  - Orders, Payments, Refunds   │
               │  - Users, Logs                 │
               │  - Transactions                │
               └───────────────┬────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
   ┌─────────────┐    ┌─────────────────┐    ┌──────────────┐
   │ Redis Cache │    │ Payment Gateway │    │Notification  │
   │(Sessions,   │    │  - Omise        │    │Service       │
   │ Rate Limit) │    │  - 2C2P         │    │  - Email     │
   └─────────────┘    │  - Bank APIs    │    │  - SMS       │
                      └────────┬────────┘    │  - Webhook   │
                               │            └──────────────┘
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
  ┌──────────┐      ┌─────────────────┐    ┌──────────────┐
  │PromptPay │      │TrueMoney Wallet │    │ Bank Systems │
  │(BoT)     │      │                 │    │              │
  └──────────┘      └─────────────────┘    └──────────────┘
```

---

# 🔧 Service Components

## 1. Authentication Service
**Responsibility:** User identity & access control

**Features:**
- JWT token generation & validation
- Password hashing (bcrypt)
- Token refresh mechanism
- Session management
- 2FA support (optional)

**Tech Stack:**
- jsonwebtoken (JWT)
- bcryptjs
- Redis (session store)

---

## 2. Order Service
**Responsibility:** Order creation & management

**Features:**
- Create orders
- Track order status
- Calculate totals (subtotal, tax, discount)
- Update order status
- Order history

**Statuses:**
```
pending → awaiting_payment → paid → fulfilled
                          ↓
                       failed
                          ↓
                       cancelled
```

**Database Tables:**
- `orders` - Order header
- `order_items` - Line items
- `order_history` - Status changes

---

## 3. Payment Service
**Responsibility:** Payment processing & verification

**Features:**
- Initiate payments
- Handle different payment methods
- Webhook reception & verification
- Retry logic
- Payment reconciliation

**Supported Methods:**
1. **PromptPay QR** (Direct QR, no redirect)
2. **TrueMoney Wallet** (Redirect)
3. **Internet Banking** (Redirect)

**Database Tables:**
- `payments` - Payment records
- `payment_logs` - Request/response logs
- `webhooks` - Webhook deliveries

---

## 4. Webhook Service
**Responsibility:** Receive & process payment callbacks

**Features:**
- Webhook signature verification (HMAC-SHA256)
- Payload parsing
- Status update
- Event logging
- Retry mechanism

**Security:**
- Signature verification required
- Timestamp validation (within 5 minutes)
- Idempotency (process only once)

---

## 5. Notification Service
**Responsibility:** Send notifications to users

**Features:**
- Email notifications
- SMS notifications
- In-app notifications
- Notification logging
- Template system

**Events:**
- Order created
- Payment initiated
- Payment completed
- Payment failed
- Refund processed

---

## 6. Reconciliation Service
**Responsibility:** Verify payment accuracy

**Features:**
- Daily reconciliation
- Detect discrepancies
- Match orders with payments
- Generate reports
- Alert on issues

**Process:**
1. Fetch order amounts
2. Fetch payment confirmations from gateway
3. Compare amounts
4. Log discrepancies
5. Alert admin

---

# 🗄️ Data Flow

## Payment Creation Flow

```
User selects item
      ↓
Frontend: Create Order (API call)
      ↓
Backend: Order Service
  - Validate items
  - Calculate total
  - Create order record
  - Return order_id
      ↓
Frontend: Display checkout
User selects payment method
      ↓
Frontend: Create Payment (API call)
  - Set X-Idempotency-Key header
  - Send method (promptpay/truemoney/bank)
      ↓
Backend: Payment Service
  - Validate order
  - Check idempotency key
  - Call payment gateway
  - Save payment record
  - Return payment details
      ↓
Frontend: Display QR/Redirect URL
User completes payment
      ↓
Payment Gateway: Process payment
      ↓
Payment Gateway: Send Webhook
      ↓
Backend: Webhook Service
  - Verify signature
  - Update payment status
  - Update order status
  - Log event
      ↓
Backend: Notification Service
  - Send confirmation email
  - Update frontend (WebSocket)
      ↓
Frontend: Display success
User can access service
```

---

# 🔐 Security Architecture

## 10-Layer Security Model

### Layer 1: Network Security
- HTTPS/TLS 1.3 (all connections)
- WAF (Web Application Firewall)
- DDoS protection
- IP whitelisting (optional)

### Layer 2: API Security
- CORS policy
- Rate limiting (100 req/min per user)
- Request validation
- Input sanitization

### Layer 3: Authentication
- JWT tokens (HS256)
- Token expiration (24h)
- Secure token storage
- Refresh token mechanism

### Layer 4: Authorization
- Role-based access control (RBAC)
- Permission checking
- Resource ownership verification

### Layer 5: Data Protection
- Encryption at transit (TLS)
- Password hashing (bcrypt 12+)
- Sensitive data masking
- PII protection

### Layer 6: Transaction Security
- Webhook signature verification (HMAC-SHA256)
- Idempotency keys
- Amount verification
- Reference number validation

### Layer 7: Database Security
- SQL injection prevention (parameterized queries)
- Connection pooling
- Encrypted credentials
- Backup encryption

### Layer 8: Logging & Monitoring
- Audit logs for all transactions
- Error tracking (Sentry)
- Real-time monitoring
- Alert system

### Layer 9: Compliance
- PCI-DSS Level 1 (if storing cards)
- GDPR compliance (data handling)
- Data retention policies
- Privacy controls

### Layer 10: Incident Response
- Incident response plan
- Backup & disaster recovery
- Incident logging
- Root cause analysis

---

# 🏢 Deployment Architecture

## Development Environment
```
Developer Laptop
├── Node.js (local)
├── PostgreSQL (Docker)
└── Redis (Docker)
```

## Staging Environment
```
AWS/DigitalOcean
├── API Server (1-2 instances)
├── PostgreSQL (RDS)
├── Redis (ElastiCache)
├── CDN (CloudFront)
└── S3 (QR code storage)
```

## Production Environment
```
AWS/DigitalOcean Cluster
├── API Load Balancer (Nginx)
├── API Servers (3+ instances, auto-scaling)
├── PostgreSQL (RDS, Multi-AZ)
├── Redis Cluster (3 nodes)
├── CDN (CloudFront)
├── S3 (QR code storage)
├── Monitoring (CloudWatch)
└── Backup (S3, incremental)
```

---

# 📈 Scalability Strategy

## Horizontal Scaling
- **API Servers:** Auto-scaling group (2-20 instances)
- **Database:** Read replicas for reporting
- **Cache:** Redis cluster with sharding

## Vertical Scaling
- Increase instance size during traffic spikes
- Database tuning (indexes, queries)
- Connection pooling optimization

## Performance Optimization
- Query caching (Redis)
- Database indexing
- Connection pooling
- CDN for static assets
- Lazy loading
- Pagination

---

# 🔄 Implementation Roadmap

## Week 1-2: Foundation
- [ ] Setup development environment
- [ ] Create database schema
- [ ] Setup API authentication
- [ ] Create basic project structure

## Week 3-4: Core Payment
- [ ] Implement Order Service
- [ ] Implement Payment Service
- [ ] Setup payment gateway integration
- [ ] Implement webhook handler

## Week 5-6: Payment Methods
- [ ] Implement PromptPay flow
- [ ] Implement TrueMoney flow
- [ ] Implement Bank transfer flow
- [ ] Test with sandbox

## Week 7-8: Supporting Services
- [ ] Implement Notification Service
- [ ] Implement Refund Service
- [ ] Setup reconciliation
- [ ] Create reporting dashboard

## Week 9-10: Testing & Security
- [ ] Unit test coverage (>80%)
- [ ] Integration testing
- [ ] Security audit
- [ ] Load testing
- [ ] Penetration testing

## Week 11-12: Deployment
- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring setup

---

# 📊 Key Metrics

### Performance Metrics
- API Response Time: < 200ms (p95)
- Webhook Delivery: > 99%
- Database Query Time: < 100ms (p95)
- Server Uptime: > 99.9%

### Business Metrics
- Payment Success Rate: > 99.5%
- Failed Payment Recovery: > 95%
- Reconciliation Accuracy: 100%
- Customer Support Response: < 2h

### Security Metrics
- Security Patch Time: < 24h
- Incident Resolution: < 4h
- Audit Log Retention: 2 years
- Encryption Coverage: 100%

---

# 🛠️ Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Runtime** | Node.js 16+ | Fast, JavaScript ecosystem |
| **Framework** | Express.js | Lightweight, popular |
| **Database** | PostgreSQL | ACID, reliable, mature |
| **Cache** | Redis | Fast, session management |
| **Auth** | JWT + bcrypt | Secure, stateless |
| **Logging** | Winston | Structured logging |
| **Monitoring** | Datadog/New Relic | Real-time insights |
| **API Docs** | OpenAPI/Swagger | Auto-generated docs |
| **Testing** | Jest + Supertest | Complete coverage |
| **CI/CD** | GitHub Actions | Integrated with GitHub |
| **Containerization** | Docker | Consistent environment |
| **Orchestration** | Docker Compose (dev), Kubernetes (prod) | Scaling |

---

# 🎯 Success Criteria

✅ **System is successful when:**
1. Handles 1000+ concurrent users
2. Payment success rate > 99.5%
3. Webhook delivery reliability > 99%
4. Zero data loss incidents
5. Response time < 200ms (p95)
6. All security checks pass
7. Full compliance with regulations
8. 24/7 uptime maintained

