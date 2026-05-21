import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PromptPay Gateway',
  description: 'Secure payment gateway powered by EdgeOne'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="dark">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
