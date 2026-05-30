import { LoanService } from '@psaipay/core';

const loanService = new LoanService();

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseBody(body: string | null): any {
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

/** GET /api/loans — list loans */
export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const status = url.searchParams.get('status') || undefined;
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const data = await loanService.list({ status, limit, offset });
  return jsonRes({ data, limit, offset });
}

/** POST /api/loans — originate loan */
export async function onRequestPost(context: any): Promise<Response> {
  const body = parseBody(await context.request.text());

  if (!body.accountId || !body.principal || !body.interestRate || !body.term) {
    return jsonRes({ error: 'accountId, principal, interestRate, and term are required' }, 400);
  }

  try {
    const loan = await loanService.originate(
      body.accountId,
      body.principal,
      body.interestRate,
      body.term,
    );
    return jsonRes(loan, 201);
  } catch (err: any) {
    return jsonRes({ error: err.message }, 400);
  }
}
