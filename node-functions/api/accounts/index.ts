import { AccountService } from '@psaipay/core';
import type { Role } from '../../packages/api/src/middleware/auth.js';

const accountService = new AccountService();

function parseBody(body: string | null): any {
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** GET /api/accounts — list accounts */
export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const type = url.searchParams.get('type') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const data = await accountService.list({ type, limit, offset });
  return jsonRes({ data, limit, offset });
}

/** POST /api/accounts — open new account */
export async function onRequestPost(context: any): Promise<Response> {
  const body = parseBody(await context.request.text());
  const { type, currency, customerId } = body;

  if (!type || !['savings', 'current', 'fx'].includes(type)) {
    return jsonRes({ error: 'Invalid account type. Must be savings, current, or fx' }, 400);
  }

  try {
    const account = await accountService.open(type, currency || 'THB', customerId);
    return jsonRes(account, 201);
  } catch (err: any) {
    return jsonRes({ error: err.message }, 400);
  }
}
