# PSAiPay — เอกสารฉบับสมบูรณ์ (จากโค้ดต้นฉบับ)

เอกสารนี้เป็นฉบับเดียวที่รวมทุกสิ่งที่จำเป็นเพื่อเข้าใจ ติดตั้ง และรันระบบ PSAiPay โดยอ้างอิงจากโค้ดจริงในรีโป (lib/ และ artifacts/) — เขียนเป็นภาษาไทย

หมายเหตุสำคัญ: เอกสารนี้สร้างจากโค้ดที่มีอยู่ในรีโป ณ เวลาคอมมิต หากต้องการให้ผมสร้างไฟล์ migration หรือ CI workflow จริง ๆ ให้คอมมิตเพิ่ม แจ้งผมได้

---

สารบัญ
1. ภาพรวมสถาปัตยกรรม
2. ข้อกำหนดเครื่องมือ
3. ตัวแ��รสิ่งแวดล้อมที่ต้องตั้งค่า (.env)
4. โครงข้อมูล (สำคัญ) และ SQL migration ตัวอย่าง
5. API endpoints สำคัญ (สรุปจาก routers)
6. การรันและทดสอบ (dev / production)
7. Webhook และการจัดการความน่าเชื่อถือ
8. ความปลอดภัยและข้อแนะนำในการใช้งาน production
9. CI / การทดสอบที่แนะนำ
10. ขั้นตอนถัดไปและรายการตรวจสอบก่อน production

---

1) ภาพรวมสถาปัตยกรรม
- แอปหลักเป็น Node.js/TypeScript (Express) แบ่งเป็นชุดของ routers (auth, merchants, transactions, deposits, withdrawals, risk, ledger, dashboard, bot, qr, slip, banks, webhooks, settings, integration)
- มีสอง entry points ที่ปรากฏในรีโป:
  - artifacts/api-server — API server แบบแยก
  - artifacts/consolidated — Monolith ที่รวม API และเสิร์ฟ static build ของ frontend
- DB schema ถูกนิยามด้วย Drizzle ใน lib/db/src/schema/*. (ไฟล์ schema สำคัญ: merchants, transactions, และอื่น ๆ เช่น deposits, withdrawals, ledger, webhook_logs)
- Authentication: JWT (middleware requireAuth) — multi-tenant fields: merchantId, tenantDbName, role
- Integration APIs: ป้องกันด้วย header X-API-Key (middleware apiKeyAuth)
- Webhook dispatcher: sign payload ด้วย HMAC-SHA256 (secret จาก env) และ retry ด้วย exponential backoff (fire-and-forget)

---

2) ข้อกำหนดเครื่องมือ
- Node.js 18+ (แนะนำ) หรือเวอร์ชันที่รองรับ ES modules / fetch
- pnpm (แนะนำ) หรือ npm
- PostgreSQL หากต้องการใช้ DB จริง (โค้ดมี schema แต่บาง router ยังใช้ in-memory store เป็นตัวอย่าง)
- Docker (ถ้าต้องการรันบริการ DB/stack)

---

3) ตัวแปรสิ่งแวดล้อม (.env) ที่สำคัญ
(ตั้งค่าอย่างน้อยค่าพื้นฐานก่อนรัน)

# Server
PORT=4000
CORS_ORIGIN=http://localhost:3000

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=8h

# Webhook
WEBHOOK_SECRET=webhook_secret_here

# Integration
INTEGRATION_API_KEYS=key1,key2

# Admin (fallback สำหรับ dev เท่านั้น)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
# หรือเก็บ hash แทน
ADMIN_PASSWORD_HASH=

# Withdrawals
AUTO_APPROVE_LIMIT=5000

# Database (ถ้าใช้)
DATABASE_URL=postgresql://user:password@localhost:5432/payment_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=payment_db
DB_USER=postgres
DB_PASSWORD=secure_password

---

4) โครงข้อมูลสำคัญ และตัวอย่าง SQL migration
ด้านล่างเป็น SQL ตัวอย่างสำหรับสร้างตาราง merchants และ transactions ตาม schema ใน lib/db/src/schema

-- 001-create-merchants.sql
```sql
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  code varchar(50) NOT NULL UNIQUE,
  email varchar(255) NOT NULL UNIQUE,
  password_hash text,
  tenant_db_name varchar(100),
  subscription_status varchar(20) DEFAULT 'active',
  role varchar(20) DEFAULT 'tenant',
  promptpay_id varchar(50),
  webhook_url text,
  webhook_secret text,
  auto_approve_limit numeric(15,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

-- 002-create-transactions.sql
```sql
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES merchants(id),
  type varchar(20) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending',
  amount numeric(15,2) NOT NULL,
  currency varchar(3) DEFAULT 'THB',
  reference varchar(100) UNIQUE,
  description text,
  metadata jsonb,
  callback_url text,
  external_ref text,
  webhook_attempts integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

หมายเหตุ:
- ฟังก์ชัน gen_random_uuid() มาจาก extension pgcrypto (หรือ use uuid-ossp -> uuid_generate_v4())
- มี schema อื่น ๆ ใน lib/db/schema ที่ควรแปลงเป็น migration เพิ่มเติม (deposits, withdrawals, ledger, webhook_logs ฯลฯ)

---

5) API endpoints สำคัญ (สรุปจากโค้ดใน artifacts/api-server/src/routes)
ต่อไปนี้คือ endpoints ที่มีอยู่โดยรวม — อาจมี subroutes ภายในแต่ละ router (โปรดดูไฟล์ router เพื่อรายละเอียดเชิง request/response)

- /api/auth
  - POST /register (สร้าง merchant — มี token กลับมา)
  - POST /login (รับ JWT)
  - POST /me (รับข้อมูลผู้ใช้จาก token)

- /api/merchants
  - (CRUD merchants)

- /api/transactions
  - (สร้าง/อ่านสถานะ transaction)

- /api/deposits
- /api/withdrawals
  - GET / (list withdrawals)
  - POST / (create withdrawal request)  — ตัวอย่างในโค้ดใช้ in-memory store
  - PATCH /:id/approve
  - PATCH /:id/reject

- /api/risk
- /api/ledger
- /api/dashboard
- /api/bot
- /api/qr
- /api/slip
- /api/banks

- /api/webhooks
  - GET /logs  (ดู logs ที่เก็บแบบ in-memory ในตัวอย่าง)
  - POST /test  (ทดสอบการยิง webhook โดยใช้ secret และบันทึก log)

- /api/settings
- /api/integration  (ต้องแนบ X-API-Key)

- GET /health  (เช็คสถานะระบบ)

การเรียก API ที่ต้องการ authentication ต้องแนบ header: Authorization: Bearer <token>
Integration ต้องแนบ: X-API-Key: <key>

---

6) การรันและทดสอบ (Development)
โค้ดในรีโปมีทั้ง artifacts ที่สามารถรันได้เลย (ตัวอย่าง) และโครง monorepo (pnpm/turbo)

ตัวอย่างรันแบบรวดเร็ว (ไม่เชื่อม DB):

1. ติดตั้ง dependencies

```bash
pnpm install
# หรือ
npm install
```

2. ตั้งค่า .env (อย่างน้อย JWT_SECRET และ INTEGRATION_API_KEYS)

3. รัน consolidated (รวม API + static frontend) เพื่อทดสอบ

```bash
pnpm --filter @psaipay/consolidated dev
# หรือ (ถ้ามี build js)
node artifacts/consolidated/dist/server.js
```

หรือรัน api-server เดี่ยว ๆ

```bash
pnpm --filter @psaipay/api-server dev
# หรือ
node artifacts/api-server/dist/index.js
```

หมายเหตุ: ในตัวอย่างหลาย router ใช้ in-memory store — หากต้องใช้ DB จริง ต้องต่อ connection และรัน migrations ที่สร้างขึ้นจาก schema

---

7) Webhook และการจัดการความน่าเชื���อถือ
- Webhook จะถูก sign โดย HMAC-SHA256 ด้วย secret (process.env.WEBHOOK_SECRET)
- มี dispatchTransactionWebhook ที่ retry ส่ง webhook แบบ exponential backoff (2s,4s,...) จำนวนครั้งเริ่มต้น 3 ครั้ง
- ใน production ควร:
  - บันทึกทุกการส่ง webhook ลง DB (ตาราง webhook_logs) พร้อมสถานะและจำนวนครั้ง
  - ให้ webhook dispatcher ทำงานแบบ background job (queue) ไม่บล็อกการทำธุรกรรม
  - เพิ่ม metrics/alerts เมื่อ webhook ล้มเหลวซ้ำ

---

8) ความปลอดภัยและคำแนะนำ production
- ห้ามเก็บ JWT_SECRET, WEBHOOK_SECRET, ADMIN_PASSWORD ใน repo — ใช้ secrets manager
- เปลี่ยน admin fallback (ADMIN_PASSWORD) เป็นเฉพาะสำหรับ dev เท่านั้น หรือปิดให้หมด
- เปิด rate limiting (express-rate-limit) สำหรับ endpoints ที่สำคัญ
- ใช้ HTTPS เสมอใน production และตั้งค่า CORS อย่างรัดกุม (CORS_ORIGIN)
- ���ยก environment ระหว่าง staging/production และใช้ DB แยก
- ล็อกและมอนิเตอร์การเข้าถึง (Sentry/Datadog/Prometheus)
- ตรวจสอบ input validation (ใช้ zod หรือ validator) — โค้ดมีการใช้งาน zod ใน package.json แสดงว่ามีแนวทาง

---

9) CI / การทดสอบที่แนะนำ
- สร้าง GitHub Actions workflow ที่รันเมื่อ push/PR:
  - Install deps
  - Lint (eslint/tsc)
  - Run tests (unit + integration)
  - Build artifacts
- เพิ่มขั้นตอน security scan (npm audit, dependency scan) และ secret scanning
- แนะนำให้มี job สำหรับรัน database migrations บน staging และ smoke tests

---

10) ขั้นตอนถัดไปและ checklist ก่อน production
- [ ] สร้าง migration SQL ครบถ้วนจากโครง schema ใน lib/db
- [ ] เชื่อม DB ในโค้ด (เช่นเชื่อม Drizzle/pg) และทดสอบ migrations
- [ ] แทนที่ in-memory stores ด้วย persistent DB สำหรับ withdrawals, webhook logs ฯลฯ
- [ ] เพิ่ม logging และ observability
- [ ] เพิ่ม test coverage (unit + integration + e2e)
- [ ] ตั้งค่า CI pipeline (lint/test/build/deploy)
- [ ] ตั้ง secrets และ environment ในระบบ deploy
- [ ] ตรวจ security checklist (HTTPS, rate limit, webhook verification, idempotency, input validation)

---

ถ้าคุณต้องการ ผมจะทำต่อโดย:
A) สร้างไฟล์ migration จริง (database/migrations/001-init.sql) ตาม SQL ที่แนบในหัวข้อ 4 และคอมมิตเข้ารีโป
B) สร้าง GitHub Actions workflow ตัวอย่างสำหรับ CI (ไฟล์ .github/workflows/ci.yml)
C) ปรับ README.md ให้ชี้ไปยังเอกสารฉบับนี้เป็นเอกสารหลัก

ตอบว่าต้องการให้ผมทำข้อใด (A/B/C) หรือทั้งหมด (A,B,C) — ผมจะทำการคอมมิตตามที่เลือกทันที