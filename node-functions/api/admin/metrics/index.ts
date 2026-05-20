import { query } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { DashboardMetrics } from '@/types'

export async function onRequestGet(context: { request: Request }): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    requireAdmin(context.request)

    const [successRateResult, activeResult, revenueResult, recentOrdersResult] = await Promise.all([
      query<{ success_rate: string }>(
        `SELECT
           ROUND(
             CASE WHEN COUNT(*) > 0
               THEN (SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100
               ELSE 0
             END, 2
           ) as success_rate
         FROM payments
         WHERE created_at >= NOW() - INTERVAL '24 hours'`
      ),
      query<{ active_payments: string }>(
        `SELECT COUNT(*) as active_payments FROM payments WHERE status = 'initiated'`
      ),
      query<{ daily_revenue: string }>(
        `SELECT COALESCE(SUM(amount), 0) as daily_revenue FROM payments WHERE status = 'paid' AND paid_at >= NOW() - INTERVAL '24 hours'`
      ),
      query(
        `SELECT o.*, p.status as payment_status
         FROM orders o
         LEFT JOIN payments p ON o.order_id = p.order_id
         ORDER BY o.created_at DESC
         LIMIT 10`
      )
    ])

    const totalOrdersResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM orders'
    )

    const metrics: DashboardMetrics = {
      success_rate: parseFloat(successRateResult.rows[0]?.success_rate ?? '0'),
      active_payments: parseInt(activeResult.rows[0]?.active_payments ?? '0'),
      daily_revenue: parseFloat(revenueResult.rows[0]?.daily_revenue ?? '0'),
      total_orders: parseInt(totalOrdersResult.rows[0]?.count ?? '0'),
      recent_orders: recentOrdersResult.rows as DashboardMetrics['recent_orders']
    }

    return new Response(JSON.stringify(metrics), { status: 200, headers: corsHeaders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    const status = message.includes('Admin access') || message.includes('token') ? 401 : 500
    return new Response(JSON.stringify({ error: message }), { status, headers: corsHeaders })
  }
}
