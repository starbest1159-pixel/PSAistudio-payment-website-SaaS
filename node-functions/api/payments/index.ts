import { createHash } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { query } from '@/lib/db'
import { createPromptPayCharge } from '@/lib/omise'
import { requireAuth } from '@/lib/auth'
import type { CreatePaymentRequest, CreatePaymentResponse } from '@/types'

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const user = requireAuth(context.request)
    const body = await context.request.json() as CreatePaymentRequest

    if (!body.order_id || !body.method || !body.amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields: order_id, method, amount' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    if (body.method !== 'promptpay') {
      return new Response(JSON.stringify({ error: 'Only promptpay method is currently supported' }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Idempotency check: SHA-256 of userId:orderId:day
    const today = new Date().toISOString().split('T')[0]
    const idempotencyKey = createHash('sha256')
      .update(`${user.user_id}:${body.order_id}:${today}`)
      .digest('hex')

    const existing = await query<{ payment_id: string; status: string; qr_code: string; reference_number: string; expired_at: string }>(
      'SELECT payment_id, status, qr_code, reference_number, expired_at FROM payments WHERE idempotency_key = $1 LIMIT 1',
      [idempotencyKey]
    )

    if (existing.rows.length > 0) {
      const prev = existing.rows[0]
      const response: CreatePaymentResponse = {
        payment_id: prev.payment_id,
        qr_code: prev.qr_code,
        reference_number: prev.reference_number,
        expired_at: prev.expired_at,
        next_action: { type: 'display_qr' }
      }
      return new Response(JSON.stringify(response), { status: 200, headers: corsHeaders })
    }

    // Verify order exists and amount matches
    const orderResult = await query<{ total_amount: number; status: string }>(
      'SELECT total_amount, status FROM orders WHERE order_id = $1 LIMIT 1',
      [body.order_id]
    )

    if (orderResult.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    const order = orderResult.rows[0]
    if (order.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Order is not in pending status' }), { status: 409, headers: corsHeaders })
    }

    // Create Omise charge
    const charge = await createPromptPayCharge(
      body.amount,
      body.order_id,
      `PromptPay payment for order ${body.order_id}`
    )

    const qrCodeUrl = charge.source?.scannable_code?.image?.download_uri ?? ''
    const referenceNumber = charge.source?.reference_code ?? ''
    const expiredAt = charge.expires_at ?? new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const paymentId = uuidv4()

    // Insert payment record
    await query(
      `INSERT INTO payments (
        payment_id, order_id, method, provider, amount, currency, status,
        idempotency_key, qr_code, reference_number, provider_txn_id, expired_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        paymentId, body.order_id, 'promptpay', 'omise', body.amount, 'THB',
        'initiated', idempotencyKey, qrCodeUrl, referenceNumber, charge.id, expiredAt
      ]
    )

    // Log creation
    await query(
      `INSERT INTO payment_logs (log_id, payment_id, event_type, description, response_payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [uuidv4(), paymentId, 'created', 'PromptPay charge created', JSON.stringify({ charge_id: charge.id })]
    )

    const response: CreatePaymentResponse = {
      payment_id: paymentId,
      qr_code: qrCodeUrl,
      reference_number: referenceNumber,
      expired_at: expiredAt,
      next_action: { type: 'display_qr' }
    }

    return new Response(JSON.stringify(response), { status: 201, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('Missing authorization') || message.includes('token') ? 401 : 500
    return new Response(JSON.stringify({ error: message }), { status, headers: corsHeaders })
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
