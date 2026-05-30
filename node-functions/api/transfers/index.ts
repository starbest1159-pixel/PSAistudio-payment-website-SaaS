import { TransferService } from '@psaipay/core';

const transferService = new TransferService();

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseBody(body: string | null): any {
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

/** GET /api/transfers/:id — get transfer status */
export async function onRequestGet(context: any): Promise<Response> {
  const transferId = context.params?.path;
  if (!transferId) {
    return jsonRes({ error: 'Transfer ID required' }, 400);
  }

  try {
    const status = await transferService.getTransferStatus(transferId);
    return jsonRes(status);
  } catch (err: any) {
    return jsonRes({ error: err.message }, 404);
  }
}

/** POST /api/transfers — initiate a transfer */
export async function onRequestPost(context: any): Promise<Response> {
  const body = parseBody(await context.request.text());

  if (!body.fromAccountId || !body.amount) {
    return jsonRes({ error: 'fromAccountId and amount are required' }, 400);
  }

  try {
    if (body.promptPayId) {
      const result = await transferService.initiatePromptPayTransfer(
        body.fromAccountId,
        body.promptPayId,
        body.amount,
        body.currency || 'THB',
      );
      return jsonRes(result, 201);
    } else if (body.toBankCode && body.toAccount) {
      const result = await transferService.initiateInterbankTransfer(
        body.fromAccountId,
        body.toBankCode,
        body.toAccount,
        body.amount,
        body.currency || 'THB',
      );
      return jsonRes(result, 201);
    } else {
      return jsonRes({ error: 'Provide either promptPayId or (toBankCode + toAccount)' }, 400);
    }
  } catch (err: any) {
    return jsonRes({ error: err.message }, 400);
  }
}
