import { FxService } from '@psaipay/core';

const fxService = new FxService();

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseBody(body: string | null): any {
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

/** GET /api/fx/rates — list FX rates */
export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const data = await fxService.listRates({ limit, offset });
  return jsonRes({ data, limit, offset });
}

/** POST /api/fx/rates — add an FX rate */
export async function onRequestPost(context: any): Promise<Response> {
  const body = parseBody(await context.request.text());

  if (!body.baseCurrency || !body.quoteCurrency || !body.rate) {
    return jsonRes({ error: 'baseCurrency, quoteCurrency, and rate are required' }, 400);
  }

  const rate = await fxService.addRate(body.baseCurrency, body.quoteCurrency, body.rate, body.source);
  return jsonRes(rate, 201);
}
