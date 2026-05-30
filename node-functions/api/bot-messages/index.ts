import { BotAdapter } from '@psaipay/core';

const botAdapter = new BotAdapter();

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseBody(body: string | null): any {
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

/** GET /api/bot-messages — list BOT messages */
export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const direction = url.searchParams.get('direction') || undefined;

  const data = await botAdapter.listMessages({ limit, offset, direction });
  return jsonRes({ data, limit, offset });
}

/** POST /api/bot-messages — send a BOT message */
export async function onRequestPost(context: any): Promise<Response> {
  const body = parseBody(await context.request.text());

  try {
    if (body.messageType === 'pain001') {
      if (!body.debtorAccount || !body.creditorAccount || !body.amount) {
        return jsonRes({ error: 'debtorAccount, creditorAccount, and amount are required for pain.001' }, 400);
      }
      const message = await botAdapter.sendPain001(
        body.debtorAccount,
        body.creditorAccount,
        body.amount,
        body.currency || 'THB',
      );
      return jsonRes(message, 201);
    } else if (body.messageType === 'pacs008') {
      if (!body.debtorBic || !body.creditorBic || !body.debtorAccount || !body.creditorAccount || !body.amount) {
        return jsonRes({ error: 'debtorBic, creditorBic, debtorAccount, creditorAccount, and amount are required for pacs.008' }, 400);
      }
      const message = await botAdapter.sendPacs008(
        body.debtorBic,
        body.creditorBic,
        body.debtorAccount,
        body.creditorAccount,
        body.amount,
        body.currency || 'THB',
      );
      return jsonRes(message, 201);
    } else if (body.payload) {
      const message = await botAdapter.receiveMessage(body.payload);
      return jsonRes(message, 201);
    } else {
      return jsonRes({ error: 'Provide messageType (pain001/pacs008) or payload for inbound messages' }, 400);
    }
  } catch (err: any) {
    return jsonRes({ error: err.message }, 400);
  }
}
