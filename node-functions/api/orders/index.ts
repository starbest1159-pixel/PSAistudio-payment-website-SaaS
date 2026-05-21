import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    requireAdmin(context.request)

    const url = new URL(context.request.url)
    const page = parseInt(url.searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100)
    const offset = (page - 1) * limit
    const status = url.searchParams.get('status')

    const conditions: string[] = []
    const params: unknown[] = []
    let paramIdx = 1

    if (status) {
      conditions.push(`o.status = $${paramIdx++}`)
      params.push(status)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    params.push(limit, offset)

    const result = await query(
      `SELECT o.*, p.status as payment_status, p.method as payment_method, p.amount as payment_amount
       FROM orders o
       LEFT JOIN payments p ON o.order_id = p.order_id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      params
    )

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM orders o ${whereClause}`,
      conditions.length > 0 ? params.slice(0, -2) : []
    )

    return new Response(JSON.stringify({
      orders: result.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0'),
      page,
      limit
    }), { status: 200, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('Admin access') || message.includes('token') ? 401 : 500
    return new Response(JSON.stringify({ error: message }), { status, headers: corsHeaders })
  }
}
