import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { merchantsRouter } from './routes/merchants.js';
import { transactionsRouter } from './routes/transactions.js';
import { depositsRouter } from './routes/deposits.js';
import { withdrawalsRouter } from './routes/withdrawals.js';
import { riskRouter } from './routes/risk.js';
import { ledgerRouter } from './routes/ledger.js';
import { dashboardRouter } from './routes/dashboard.js';
import { botRouter } from './routes/bot.js';
import { qrRouter } from './routes/qr.js';
import { slipRouter } from './routes/slip.js';
import { banksRouter } from './routes/banks.js';
import { webhooksRouter } from './routes/webhooks.js';
import { settingsRouter } from './routes/settings.js';
import { accountsRouter } from './routes/accounts.js';
import { loansRouter } from './routes/loans.js';
import { cardsRouter } from './routes/cards.js';
import { fxRouter } from './routes/fx.js';
import { botMessagesRouter } from './routes/bot-messages.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10mb' }));

// Original routes
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

// New banking routes
app.use('/api/accounts', accountsRouter);
app.use('/api/loans', loansRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/fx', fxRouter);
app.use('/api/bot-messages', botMessagesRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '2.0.0' }));

app.listen(PORT, () => {
  console.log(`PSAiPay API v2 running on port ${PORT}`);
});

export default app;
