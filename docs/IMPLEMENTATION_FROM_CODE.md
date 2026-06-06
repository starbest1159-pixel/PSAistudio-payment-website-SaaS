# เอกสารสรุปจากโค้ด (Generated from source)

เอกสารนี้สร้างโดยอ่านโค้ดจริงในรีโป (lib/ และ artifacts/) เพื่อสรุปการทำงาน, API, โมเดลข้อมูล, ค่าที่ต้องตั้งใน env, และวิธีรันระบบ แบบสั้น กระชับ (ภาษาไทย)

## ขอบเขต
- อ้างอิงจาก: lib/db/src/schema/* (Drizzle schema), artifacts/api-server/src/** และ artifacts/consolidated/src/**
- ไม่อ้างอิงจากเอกสารต้นฉบับ — ข้อมูลมาจากโค้ดจริง

---

## ภาพรวมระบบ
PSAiPay เป็นระบบ API สำหรับจัดการ merchants, transactions, deposits, withdrawals, webhooks และ endpoints อื่น ๆ (multi-tenant แบบง่าย)
มีทั้งโครงสร้างแยกเป็น api-server และ consolidated monolith ที่เสิร์ฟ static frontend จาก artifacts/consolidated/public

แอปหลักเป็น Express app (TypeScript) ที่ expose หลาย router:
- /api/auth
- /api/merchants
- /api/transactions
- /api/deposits
- /api/withdrawals
- /api/risk
- /api/ledger
- /api/dashboard
- /api/bot
- /api/qr
- /api/slip
- /api/banks
- /api/webhooks
- /api/settings
- /api/integration (ต้องใช้ X-API-Key)

มี /health endpoint สำหรับตรวจสถานะ

---

## โมเดลข้อมูลสำคัญ (จาก lib/db/src/schema)
สรุปเฉพาะฟิลด์ที่สำคัญ

- merchants
  - id (uuid)
  - name, code, email
  - passwordHash
  - tenantDbName
  - subscriptionStatus
  - webhookUrl, webhookSecret
  - promptpayId
  - autoApproveLimit
  - isActive, createdAt, updatedAt

- transactions
  - id (uuid)
  - merchantId (references merchants.id)
  - type, status (default 'pending')
  - amount (numeric), currency (default 'THB')
  - reference (unique), description, metadata (jsonb)
  - callbackUrl, externalRef
  - webhookAttempts, createdAt, updatedAt

มี schema อื่น ๆ: deposits, withdrawals, ledger, risk_rules, bot_jobs, bank_connections, webhook_logs, settings, slip_hashes — โครงคล้ายกันตามชื่อไฟล์

---

## พฤติกรรมสำคัญจากโค้ด
- Authentication: JWT-based middleware (requireAuth) อ่าน token จาก Authorization: Bearer <token> แล้ว attach req.user, req.merchantId, req.tenantDbName, req.role
- Integration endpoints (/api/integration) ป้องกันด้วย X-API-Key header — คีย์อ่านจาก env INTEGRATION_API_KEYS (comma-separated)
- Webhook dispatch: มีโมดูล dispatchTransactionWebhook ที่ sign payload ด้วย HMAC-SHA256 (secret จาก process.env.WEBHOOK_SECRET) และส่งแบบ retry + exponential backoff (fire-and-forget)
- Withdrawals router ใช้ in-memory store สำหรับตัวอย่าง/เดโม — มีค่า AUTO_APPROVE_LIMIT ที่อ่านจาก env และมีการ auto-approve หากจำนวนไม่เกินค่า
- Server config: helmet, cors (CORS_ORIGIN จาก env หรือ '*'), express.json with limit 10mb

---

## ตัวแปรสภาพแวดล้อมที่สำคัญ (env)
(ตั้งค่าตามความต้องการจริงใน production; ค่านี้อ่านจากโค้ด)

- PORT (default 4000)
- CORS_ORIGIN
- JWT_SECRET (ใช้สำหรับ sign/verify JWT)
- JWT_EXPIRES_IN / JWT_EXPIRY
- WEBHOOK_SECRET (ใช้ sign webhook payload)
- INTEGRATION_API_KEYS (comma-separated)
- ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_PASSWORD_HASH (รองรับ admin fallback ใน auth)
- AUTO_APPROVE_LIMIT (สำหรับ withdrawals auto-approve)
- DATABASE_URL / DB connection variables (lib schema แสดงออกแบบ DB แต่ implementation DB connection อยู่ในโค้ดอื่นหากมี)

---

## วิธีรันอย่างรวดเร็ว (จากโค้ด artifacts)
เอกสารนี้สมมติคุณมี Node 18+ และ pnpm/npm ติดตั้งแล้ว

1) ติดตั้ง dependencies (ที่ root หรือภายในแพ็กเกจย่อยตาม workspace)

```bash
pnpm install
# หรือ
npm install
```

2) ตั้งค่า .env (อย่างน้อยต้องมี JWT_SECRET และ INTEGRATION_API_KEYS)

3) รัน monolith (consolidated) เพื่อทดสอบแบบครบวงจร

```bash
# รัน consolidated (artifact) ที่เสิร์ฟ API + static
node artifacts/consolidated/dist/server.js   # ถ้ามาเป็น build
# หรือรันผ่าน ts-node เมื่อพัฒนา
pnpm --filter @psaipay/consolidated dev
```

หรือรัน api-server เดียว ๆ

```bash
pnpm --filter @psaipay/api-server dev
```

หมายเหตุ: artifacts/ มีตัวอย่างซอร์สที่พร้อมรัน; โฟลเดอร์ lib/ มี schema ของ DB แต่ไม่มีสคริปต์การเชื่อม DB ในโค้ด artifacts ที่เรียกใช้โดยตรง — ต้องเพิ่ม connection ที่เหมาะสมเมื่อเชื่อมต่อ DB จริง

---

## ตัวอย่างการใช้ API เบื้องต้น (curl)
- ขอ health

```bash
curl http://localhost:4000/health
```

- สมัคร merchant (ขึ้นกับ route /api/auth/register หรือ /api/auth — โค้ด artifacts มีการสร้าง merchant ใน auth router)

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","email":"demo@example.com","password":"pass123"}'
```

- เข้าสู่ระบบ (login) และใช้ JWT

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"pass123"}'

# จะได้ token กลับมา ใช้ในการเรียก API ที่ต้อง auth
curl http://localhost:4000/api/transactions \
  -H "Authorization: Bearer <token>"
```

- เรียก integration API (X-API-Key)

```bash
curl http://localhost:4000/api/integration/some-endpoint \
  -H "X-API-Key: your-integration-key"
```

---

## ข้อสังเกตและคำแนะนำจากการอ่านโค้ด
1. มีการใช้งาน in-memory stores ในบาง router (เช่น withdrawals) — ไม่เหมาะกับ production ต้องต่อ DB แทน
2. Webhook dispatcher มี retry/backoff ดี แต่ควรบันทึก webhook logs ลง DB (มี webhook_logs schema) และเพิ่ม metrics
3. Authentication: admin fallback อ่านรหัสจาก env — ตรวจสอบให้แน่ใจว่า ADMIN_PASSWORD ไม่เก็บ plaintext ใน production
4. ควรมี CI: lint, test, build pipeline (ใน repo ยังไม่เห็น .github/workflows ที่รัน test/build)
5. ควรมีสคริปต์การเชื่อม DB และ migrations ที่เล่นงาน schema (lib/db มี schema แต่ต้องมี migration generator หรือ SQL export)
6. ควรย้ายไฟล์ zip / ไบนารีออกจากต้นทางไปยัง release/artifact storage

---

ถ้าต้องการ ผมจะ:
- เพิ่มไฟล์นี้เป็น docs/IMPLEMENTATION_FROM_CODE.md ในรีโป (ผมจะคอมมิตให้)
- หรือ ขยายเป็นคู่มือติดตั้งเชิงลึก (รวมการตั้งค่า DB, migration SQL ที่สร้างจาก schema, ตัวอย่าง docker-compose พร้อม env)

(ผมจะคอมมิตไฟล์นี้ให้ตามที่คุณสั่ง)