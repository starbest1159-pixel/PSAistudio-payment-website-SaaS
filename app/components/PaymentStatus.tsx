'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface PaymentStatusProps {
  paymentId: string
  token: string
}

type Status = 'initiated' | 'paid' | 'failed' | 'expired'

const TERMINAL_STATUSES: Status[] = ['paid', 'failed', 'expired']

export default function PaymentStatus({ paymentId, token }: PaymentStatusProps) {
  const [status, setStatus] = useState<Status>('initiated')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) {
        setError('Failed to fetch payment status')
        return
      }

      const data = await res.json() as { status: Status }
      setStatus(data.status)

      if (data.status === 'paid') {
        setTimeout(() => router.push('/checkout/success'), 1000)
      }
    } catch {
      setError('Connection error. Retrying...')
    }
  }, [paymentId, token, router])

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(status)) return

    const interval = setInterval(pollStatus, 3000)
    return () => clearInterval(interval)
  }, [status, pollStatus])

  const statusConfig: Record<Status, { label: string; color: string }> = {
    initiated: { label: 'Waiting for payment...', color: 'text-amber-400' },
    paid: { label: 'Payment successful!', color: 'text-green-400' },
    failed: { label: 'Payment failed', color: 'text-red-400' },
    expired: { label: 'QR code expired', color: 'text-slate-400' }
  }

  const config = statusConfig[status]

  return (
    <div className="flex flex-col items-center gap-2">
      {status === 'initiated' && (
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
      )}
      <p className={`font-medium ${config.color}`}>{config.label}</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
