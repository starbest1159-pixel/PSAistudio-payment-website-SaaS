'use client'

interface Order {
  order_id: string
  total_amount: number
  status: string
  payment_status?: string
  payment_method?: string
  created_at: string
}

interface OrderTableProps {
  orders: Order[]
  total: number
  page: number
  onPageChange: (page: number) => void
}

const statusBadge: Record<string, string> = {
  pending: 'bg-amber-900/50 text-amber-300',
  paid: 'bg-green-900/50 text-green-300',
  cancelled: 'bg-slate-700 text-slate-400',
  failed: 'bg-red-900/50 text-red-300',
  initiated: 'bg-blue-900/50 text-blue-300',
  expired: 'bg-slate-700 text-slate-400'
}

export default function OrderTable({ orders, total, page, onPageChange }: OrderTableProps) {
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-800">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Order ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Amount</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Payment</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-400">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No orders found</td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.order_id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-300">{order.order_id.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-slate-200">฿{Number(order.total_amount).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge[order.status] ?? 'bg-slate-700 text-slate-400'}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {order.payment_status && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge[order.payment_status] ?? 'bg-slate-700 text-slate-400'}`}>
                      {order.payment_status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-700 px-4 py-3">
          <p className="text-xs text-slate-500">Total: {total} orders</p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded px-3 py-1 text-xs bg-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-600 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-xs text-slate-400">{page} / {totalPages}</span>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded px-3 py-1 text-xs bg-slate-700 text-slate-300 disabled:opacity-40 hover:bg-slate-600 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
