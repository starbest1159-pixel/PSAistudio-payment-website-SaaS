import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';

// Import routers from original api-server
import { authRouter } from '../api-server/src/routes/auth.js';
import { merchantsRouter } from '../api-server/src/routes/merchants.js';
import { transactionsRouter } from '../api-server/src/routes/transactions.js';
import { depositsRouter } from '../api-server/src/routes/deposits.js';
import { withdrawalsRouter } from '../api-server/src/routes/withdrawals.js';
import { riskRouter } from '../api-server/src/routes/risk.js';
import { ledgerRouter } from '../api-server/src/routes/ledger.js';
import { dashboardRouter } from '../api-server/src/routes/dashboard.js';
import { botRouter } from '../api-server/src/routes/bot.js';
import { qrRouter } from '../api-server/src/routes/qr.js';
import { slipRouter } from '../api-server/src/routes/slip.js';
import { banksRouter } from '../api-server/src/routes/banks.js';
import { webhooksRouter } from '../api-server/src/routes/webhooks.js';
import { settingsRouter } from '../api-server/src/routes/settings.js';
import { integrationRouter } from '../api-server/src/routes/integration.js';
import { apiKeyAuth } from '../api-server/src/middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/merchants', merchantsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/deposits', depositsRouter);
app.use('/api/withdrawals', withdrawalsRouter);
app.use('/api/risk', riskRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/bot', botRouter);
app.use('/api/qr', qrRouter);
app.use('/api/slip', slipRouter);
app.use('/api/banks', banksRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/integration', apiKeyAuth, integrationRouter);

// Serve frontend static build from consolidated/public
const publicDir = path.join(process.cwd(), 'artifacts', 'consolidated', 'public');
app.use(express.static(publicDir));

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(PORT, () => {
  console.log(`PSAiPay Monolith running on port ${PORT}`);
});

export default app;
