import { createHmac, timingSafeEqual } from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { query } from '@/lib/db'

interface WebhookEvent {
  key: string
  created_at: string
  data: {
    id: string
    object: string
    status?: string
    amount?: number
    metadata?: { order_id?: string }
  }
}

export async function onRequestPost(context: { request: Request }): Promise<Response> {
  const alwaysOk = new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })

  let rawBody = ''
  let signatureVerified = false

  try {
    rawBody = await context.request.text()
    const signature = context.request.headers.get('x-omise-signature') ?? ''
    const webhookSecret = process.env.OMISE_WEBHOOK_SECRET

    if (webhookSecret && signature) {
      const expectedSig = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex')

      const sigBuffer = Buffer.from(signature)
      const expectedBuffer = Buffer.from(expectedSig)

      if (sigBuffer.length === expectedBuffer.length) {
        signatureVerified = timingSafeEqual(sigBuffer, expectedBuffer)
      }

      if (!signatureVerified) {
        console.warn('Webhook signature verification failed')
        await query(
          `INSERT INTO payment_logs (log_id, payment_id, event_type, description, webhook_payload, signature_verified)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), null, 'webhook_signature_failed', 'Invalid webhook signature', rawBody, false]
        )
        return alwaysOk
      }
    }

    const event: WebhookEvent = JSON.parse(rawBody)
    const chargeId = event.data?.id

    if (!chargeId) return alwaysOk

    // Look up payment by provider_txn_id
    const paymentResult = await query<{ payment_id: string; order_id: string; amount: number; status: string }>(
      'SELECT payment_id, order_id, amount, status FROM payments WHERE provider_txn_id = $1 LIMIT 1',
      [chargeId]
    )

    if (paymentResult.rows.length === 0) {
      console.warn('Webhook received for unknown charge:', chargeId)
      return alwaysOk
    }

    const payment = paymentResult.rows[0]
    const eventKey = event.key ?? ''

    if (eventKey.includes('charge.complete') || event.data?.status === 'successful') {
      // Mark payment paid
      await query(
        `UPDATE payments SET status = 'paid', provider_txn_id = $1, paid_at = NOW(), webhook_received_at = NOW(), updated_at = NOW()
         WHERE payment_id = $2 AND status = 'initiated'`,
        [chargeId, payment.payment_id]
      )

      // Update order status
      await query(
        `UPDATE orders SET status = 'paid', updated_at = NOW() WHERE order_id = $1`,
        [payment.order_id]
      )

      await query(
        `INSERT INTO payment_logs (log_id, payment_id, event_type, description, webhook_payload, signature_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), payment.payment_id, 'webhook_received', 'Payment completed via webhook', rawBody, signatureVerified]
      )
    } else if (eventKey.includes('charge.failed') || event.data?.status === 'failed') {
      await query(
        `UPDATE payments SET status = 'failed', webhook_received_at = NOW(), updated_at = NOW()
         WHERE payment_id = $1 AND status = 'initiated'`,
        [payment.payment_id]
      )

      await query(
        `INSERT INTO payment_logs (log_id, payment_id, event_type, description, webhook_payload, signature_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), payment.payment_id, 'webhook_received', 'Payment failed via webhook', rawBody, signatureVerified]
      )
    }

    return alwaysOk
  } catch (error) {
    console.error('Webhook handler error:', error)
    // Always return 200 to prevent gateway retry storms
    return alwaysOk
  }
}
