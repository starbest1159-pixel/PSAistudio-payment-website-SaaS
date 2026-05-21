'use client'

import { useState, useEffect } from 'react'

interface QRDisplayProps {
  qrCodeUrl: string
  referenceNumber: string
  expiredAt: string
  amount: number
}

export default function QRDisplay({ qrCodeUrl, referenceNumber, expiredAt, amount }: QRDisplayProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    const expiry = new Date(expiredAt).getTime()
    const update = () => {
      const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiredAt])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const isExpiring = timeLeft < 120

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
      <h3 className="text-lg font-semibold text-slate-200">Scan to Pay</h3>
      <p className="text-2xl font-bold text-green-400">฿{amount.toLocaleString()}</p>

      <div className="rounded-xl bg-white p-3">
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="PromptPay QR Code" width={200} height={200} className="block" />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center text-slate-400 text-sm">
            QR Code loading...
          </div>
        )}
      </div>

      <div className={`rounded-lg px-4 py-2 text-sm font-medium ${isExpiring ? 'bg-red-900/50 text-red-300' : 'bg-slate-700 text-slate-300'}`}>
        Expires in: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {referenceNumber && (
        <p className="text-xs text-slate-500">Ref: {referenceNumber}</p>
      )}
    </div>
  )
}
