import { query } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Payment } from '@/types'

export async function onRequestGet(context: { request: Request; params: { id: string } }): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    requireAuth(context.request)
    const paymentId = context.params.id

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Payment ID is required' }), { status: 400, headers: corsHeaders })
    }

    const result = await query<Payment>(
      `SELECT * FROM payments WHERE payment_id = $1 LIMIT 1`,
      [paymentId]
    )

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), { status: 404, headers: corsHeaders })
    }

    const payment = result.rows[0]

    // Auto-expire if past expired_at and still initiated
    if (payment.status === 'initiated' && payment.expired_at) {
      const expiredAt = new Date(payment.expired_at)
      if (expiredAt < new Date()) {
        await query(
          'UPDATE payments SET status = $1, updated_at = NOW() WHERE payment_id = $2',
          ['expired', paymentId]
        )
        payment.status = 'expired'
      }
    }

    return new Response(JSON.stringify(payment), { status: 200, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('Missing authorization') || message.includes('token') ? 401 : 500
    return new Response(JSON.stringify({ error: message }), { status, headers: corsHeaders })
  }
}
