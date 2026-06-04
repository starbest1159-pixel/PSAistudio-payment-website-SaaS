import crypto from 'crypto';

interface WebhookPayload {
  transactionId: string;
  externalRef: string;
  status: string;
  amount: string;
  timestamp: string;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function dispatchWithRetry(
  callbackUrl: string,
  payload: WebhookPayload,
  secret: string,
  maxAttempts: number = 3,
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, secret);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
        },
        body,
      });

      if (response.ok) {
        console.log(`[webhook-dispatcher] Delivered to ${callbackUrl} on attempt ${attempt}`);
        return;
      }

      console.warn(
        `[webhook-dispatcher] Non-OK response ${response.status} from ${callbackUrl} on attempt ${attempt}`,
      );
    } catch (err) {
      console.warn(
        `[webhook-dispatcher] Delivery error to ${callbackUrl} on attempt ${attempt}: ${err}`,
      );
    }

    if (attempt < maxAttempts) {
      const delayMs = Math.pow(2, attempt) * 1000; // exponential backoff: 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error(
    `[webhook-dispatcher] Failed to deliver to ${callbackUrl} after ${maxAttempts} attempts`,
  );
}

/**
 * Fire-and-forget webhook dispatch for transaction status changes.
 * Non-blocking: errors are logged but never propagated to the caller.
 */
export function dispatchTransactionWebhook(
  callbackUrl: string,
  transactionId: string,
  externalRef: string | null,
  status: string,
  amount: string,
): void {
  if (!callbackUrl) return;

  const secret = process.env.WEBHOOK_SECRET || 'secret';
  const payload: WebhookPayload = {
    transactionId,
    externalRef: externalRef || '',
    status,
    amount,
    timestamp: new Date().toISOString(),
  };

  // Fire-and-forget: we intentionally do not await
  dispatchWithRetry(callbackUrl, payload, secret).catch((err) => {
    console.error(`[webhook-dispatcher] Unexpected error: ${err}`);
  });
}
