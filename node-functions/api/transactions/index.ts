import { db } from '@psaipay/db';
import { transactions } from '@psaipay/db';
import { eq, desc, sql, and } from 'drizzle-orm';

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** GET /api/transactions — list transactions */
export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const merchantId = url.searchParams.get('merchantId');

  const conditions = [];
  if (status) conditions.push(eq(transactions.status, status));
  if (type) conditions.push(eq(transactions.type, type));
  if (merchantId) conditions.push(eq(transactions.merchantId, merchantId));

  const data = await db
    .select()
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(transactions.createdAt));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return jsonRes({ data, total: count, limit, offset });
}
