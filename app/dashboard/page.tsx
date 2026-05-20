'use client'

import { useState, useEffect, useCallback } from 'react'
import MetricsCard from '../components/MetricsCard'
import OrderTable from '../components/OrderTable'
import type { DashboardMetrics } from '@/types'

const REFRESH_INTERVAL = 30_000

function getToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('admin_token') ?? ''
  }
  return ''
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [orders, setOrders] = useState<DashboardMetrics['recent_orders']>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMetrics = useCallback(async () => {
    const token = getToken()
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json() as DashboardMetrics
        setMetrics(data)
        setLastUpdated(new Date())
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    }
  }, [])

  const fetchOrders = useCallback(async (p: number) => {
    const token = getToken()
    try {
      const res = await fetch(`/api/orders?page=${p}&limit=10`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json() as { orders: DashboardMetrics['recent_orders']; total: number }
        setOrders(data.orders)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchMetrics(), fetchOrders(1)])
      setLoading(false)
    }
    void init()
    const interval = setInterval(fetchMetrics, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchMetrics, fetchOrders])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    void fetchOrders(newPage)
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Payment Gateway</h1>
            <p className="mt-1 text-sm text-slate-400">PromptPay Dashboard</p>
          </div>
          {lastUpdated && (
            <p className="text-xs text-slate-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricsCard
                title="Success Rate (24h)"
                value={`${metrics?.success_rate ?? 0}%`}
                subtitle="Target: > 99.5%"
                color="green"
              />
              <MetricsCard
                title="Active Payments"
                value={metrics?.active_payments ?? 0}
                subtitle="Awaiting confirmation"
                color="amber"
              />
              <MetricsCard
                title="Daily Revenue"
                value={`฿${(metrics?.daily_revenue ?? 0).toLocaleString()}`}
                subtitle="Last 24 hours"
                color="blue"
              />
              <MetricsCard
                title="Total Orders"
                value={metrics?.total_orders ?? 0}
                subtitle="All time"
                color="purple"
              />
            </div>

            <div>
              <h2 className="mb-4 text-lg font-semibold text-slate-200">Orders</h2>
              <OrderTable
                orders={orders}
                total={total}
                page={page}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
