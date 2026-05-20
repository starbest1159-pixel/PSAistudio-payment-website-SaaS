export default function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-green-800 bg-green-900/20 p-10 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-900/50">
          <svg className="h-8 w-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-green-400">Payment Successful</h1>
        <p className="mt-2 text-sm text-slate-400">Your payment has been confirmed. Thank you!</p>
        <a
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-green-800/50 px-6 py-2 text-sm text-green-300 hover:bg-green-800/70 transition-colors"
        >
          Back to Dashboard
        </a>
      </div>
    </div>
  )
}
