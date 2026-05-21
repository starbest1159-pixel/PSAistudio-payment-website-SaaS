import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth.js';

export const webhooksRouter = Router();
webhooksRouter.use(requireAuth);

const logs: any[] = [];

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

webhooksRouter.get('/logs', (_req, res) => res.json(logs));
webhooksRouter.post('/test', async (req, res) => {
  const { url, event, payload, secret } = req.body;
  const body = JSON.stringify(payload || { event });
  const sig = signPayload(body, secret || process.env.WEBHOOK_SECRET || 'secret');
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-PSAiPay-Signature': sig },
      body,
    });
    const log = { id: crypto.randomUUID(), url, event, success: r.ok, statusCode: r.status, createdAt: new Date() };
    logs.push(log);
    res.json(log);
  } catch (err) {
    const log = { id: crypto.randomUUID(), url, event, success: false, error: String(err), createdAt: new Date() };
    logs.push(log);
    res.status(500).json(log);
  }
});
