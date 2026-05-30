import { db } from '@psaipay/db';
import { merchants } from '@psaipay/db';
import { eq, desc, sql } from 'drizzle-orm';

function jsonRes(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function parseBody(body: string | null): any {
  try { return body ? JSON.parse(body) : {}; } catch { return {}; }
}

/** GET /api/merchants — list merchants */
export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  const data = await db
    .select()
    .from(merchants)
    .limit(limit)
    .offset(offset)
    .orderBy(desc(merchants.createdAt));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(merchants);

  return jsonRes({ data, total: count, limit, offset });
}

/** POST /api/merchants — create merchant */
export async function onRequestPost(context: any): Promise<Response> {
  const body = parseBody(await context.request.text());

  if (!body.name || !body.code) {
    return jsonRes({ error: 'Name and code are required' }, 400);
  }

  const [merchant] = await db
    .insert(merchants)
    .values(body)
    .returning();

  return jsonRes(merchant, 201);
}
