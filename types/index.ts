export type PaymentStatus = 'initiated' | 'paid' | 'failed' | 'expired'
export type PaymentMethod = 'promptpay' | 'truemoney' | 'bank_transfer'
export type OrderStatus = 'pending' | 'paid' | 'cancelled'

export interface User {
  user_id: string
  email: string
  name: string
  created_at: string
}

export interface Order {
  order_id: string
  user_id: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  status: OrderStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface Payment {
  payment_id: string
  order_id: string
  method: PaymentMethod
  provider: string
  amount: number
  currency: string
  status: PaymentStatus
  idempotency_key: string
  qr_code?: string
  reference_number?: string
  redirect_url?: string
  provider_txn_id?: string
  paid_at?: string
  webhook_received_at?: string
  expired_at?: string
  created_at: string
  updated_at: string
}

export interface PaymentLog {
  log_id: string
  payment_id: string
  event_type: string
  description?: string
  request_payload?: Record<string, unknown>
  response_payload?: Record<string, unknown>
  webhook_payload?: Record<string, unknown>
  signature_verified?: boolean
  created_at: string
}

export interface OmiseCharge {
  id: string
  object: string
  status: string
  amount: number
  currency: string
  description: string
  source: {
    id: string
    object: string
    type: string
    reference_code: string
    scannable_code: {
      image: {
        id: string
        object: string
        download_uri: string
      }
    }
  }
  expires_at: string
}

export interface DashboardMetrics {
  success_rate: number
  active_payments: number
  daily_revenue: number
  total_orders: number
  recent_orders: Array<Order & { payment_status?: PaymentStatus }>
}

export interface CreatePaymentRequest {
  order_id: string
  method: PaymentMethod
  amount: number
  user_id: string
}

export interface CreatePaymentResponse {
  payment_id: string
  qr_code: string
  reference_number: string
  expired_at: string
  next_action: {
    type: 'display_qr'
  }
}
