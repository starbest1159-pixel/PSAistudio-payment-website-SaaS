import { CardService } from '@psaipay/core';

const cardService = new CardService();

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseBody(body: string | null): any {
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

/** GET /api/cards — list cards */
export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const data = await cardService.list({ limit, offset });
  return jsonRes({ data, limit, offset });
}

/** POST /api/cards — issue a card */
export async function onRequestPost(context: any): Promise<Response> {
  const body = parseBody(await context.request.text());

  if (!body.accountId || !body.cardType || !body.brand) {
    return jsonRes({ error: 'accountId, cardType, and brand are required' }, 400);
  }

  try {
    const card = await cardService.issue(body.accountId, body.cardType, body.brand);
    return jsonRes(card, 201);
  } catch (err: any) {
    return jsonRes({ error: err.message }, 400);
  }
}
