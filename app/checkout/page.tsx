'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import QRDisplay from '../components/QRDisplay'
import PaymentStatus from '../components/PaymentStatus'
import type { CreatePaymentResponse } from '@/types'

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id') ?? ''
  const amount = parseFloat(searchParams.get('amount') ?? '0')
  const token = searchParams.get('token') ?? ''

  const [payment, setPayment] = useState<CreatePaymentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const createPayment = useCallback(async () => {
    if (!orderId || !amount || !token) {
      setError('Missing payment parameters. Please return to checkout.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ order_id: orderId, method: 'promptpay', amount })
      })

      const data = await res.json() as CreatePaymentResponse & { error?: string }

      if (!res.ok) {
        setError(data.error ?? 'Failed to create payment')
        return
      }

      setPayment(data)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [orderId, amount, token])

  useEffect(() => {
    void createPayment()
  }, [createPayment])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="rounded-xl border border-red-800 bg-red-900/20 p-8 text-center">
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-100">PromptPay Payment</h1>
          <p className="mt-1 text-sm text-slate-400">Scan the QR code with your banking app</p>
        </div>

        {payment && (
          <>
            <QRDisplay
              qrCodeUrl={payment.qr_code}
              referenceNumber={payment.reference_number}
              expiredAt={payment.expired_at}
              amount={amount}
            />
            <PaymentStatus paymentId={payment.payment_id} token={token} />
          </>
        )}
      </div>
    </div>
  )
}
