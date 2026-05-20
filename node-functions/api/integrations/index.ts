import { timingSafeEqual } from 'crypto'
import { query } from '@/lib/db'

interface IntegrationRequest {
  action: 'query_payment' | 'query_order'
  reference?: string
  order_id?: string
}

function verifyApiKey(request: Request): boolean {
  const apiKey = request.headers.get('x-api-key')
  const validKey = process.env.INTEGRATION_API_KEY
  if (!apiKey || !validKey) return false

  try {
    const a = Buffer.from(apiKey)
    const b = Buffer.from(validKey)
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  if (!verifyApiKey(context.request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
  }

  try {
    const body = await context.request.json() as IntegrationRequest

    if (body.action === 'query_payment' && body.reference) {
      const result = await query<{ payment_id: string; status: string; amount: number; paid_at: string }>(
        `SELECT payment_id, status, amount, currency, paid_at, reference_number
         FROM payments WHERE reference_number = $1 LIMIT 1`,
        [body.reference]
      )

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers: corsHeaders })
      }

      return new Response(JSON.stringify({ data: result.rows[0] }), { status: 200, headers: corsHeaders })
    }

    if (body.action === 'query_order' && body.order_id) {
      const result = await query(
        `SELECT o.order_id, o.total_amount, o.status, o.created_at, p.status as payment_status, p.method
         FROM orders o
         LEFT JOIN payments p ON o.order_id = p.order_id
         WHERE o.order_id = $1 LIMIT 1`,
        [body.order_id]
      )

      if (result.rows.length === 0) {
        return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
      }

      return new Response(JSON.stringify({ data: result.rows[0] }), { status: 200, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: 'Invalid action or missing parameters' }), { status: 400, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders })
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
    }
  })
}
