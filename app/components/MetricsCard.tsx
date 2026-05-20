'use client'

interface MetricsCardProps {
  title: string
  value: string | number
  subtitle?: string
  color?: 'green' | 'blue' | 'purple' | 'amber'
}

const colorMap = {
  green: 'text-green-400 bg-green-400/10 border-green-400/20',
  blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
}

export default function MetricsCard({ title, value, subtitle, color = 'blue' }: MetricsCardProps) {
  return (
    <div className={`rounded-xl border p-6 ${colorMap[color]}`}>
      <p className="text-sm font-medium text-slate-400">{title}</p>
      <p className={`mt-2 text-3xl font-bold`}>{value}</p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  )
}
