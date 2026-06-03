import { Router, Response } from 'express';
import crypto from 'crypto';
import { dispatchTransactionWebhook } from '../lib/webhook-dispatcher.js';

export const integrationRouter = Router();

const transactionStore: any[] = [];

interface CreatePaymentBody {
  sessionId: string;
  amount: string;
  currency: string;
  recipient: string;
  callbackUrl: string;
}

function isValidPayload(body: any): body is CreatePaymentBody {
  return (
    body &&
    typeof body.sessionId === 'string' && body.sessionId.length > 0 &&
    typeof body.amount === 'string' && body.amount.length > 0 &&
    typeof body.currency === 'string' && body.currency.length === 3 &&
    typeof body.recipient === 'string' && body.recipient.length > 0 &&
    typeof body.callbackUrl === 'string' && body.callbackUrl.length > 0
  );
}

integrationRouter.post<'/payments', any, any, CreatePaymentBody>('/payments', (req, res: Response) => {
  if (!isValidPayload(req.body)) {
    return res.status(400).json({
      error: 'Invalid payload. Required fields: sessionId, amount, currency (3-letter), recipient, callbackUrl',
    });
  }

  const { sessionId, amount, currency, recipient, callbackUrl } = req.body;

  // Check for duplicate sessionId (externalRef)
  const existing = transactionStore.find((t) => t.externalRef === sessionId);
  if (existing) {
    return res.status(409).json({
      error: 'Duplicate session',
      transactionId: existing.id,
      status: existing.status,
    });
  }

  const transactionId = crypto.randomUUID();
  const transaction = {
    id: transactionId,
    type: 'payment',
    status: 'pending',
    amount,
    currency,
    recipient,
    externalRef: sessionId,
    callbackUrl,
    webhookAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  transactionStore.push(transaction);

  return res.status(201).json({
    transactionId,
    status: transaction.status,
  });
});
