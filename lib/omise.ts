const OMISE_API_URL = 'https://api.omise.co'

function getAuthHeader(): string {
  const secretKey = process.env.OMISE_SECRET_KEY
  if (!secretKey) throw new Error('OMISE_SECRET_KEY is not configured')
  return 'Basic ' + Buffer.from(secretKey + ':').toString('base64')
}

async function omiseFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${OMISE_API_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers
    }
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Omise API error ${response.status}: ${errorBody}`)
  }

  return response.json() as Promise<T>
}

function toFormData(obj: Record<string, string | number>): string {
  return Object.entries(obj)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')
}

export interface OmiseChargeResult {
  id: string
  status: string
  amount: number
  currency: string
  expires_at: string
  source: {
    id: string
    type: string
    reference_code: string
    scannable_code?: {
      image: {
        download_uri: string
      }
    }
  }
}

export async function createPromptPayCharge(
  amountTHB: number,
  orderId: string,
  description: string
): Promise<OmiseChargeResult> {
  // Omise uses satang (1 THB = 100 satang)
  const amountSatang = Math.round(amountTHB * 100)

  const body = toFormData({
    'amount': amountSatang,
    'currency': 'thb',
    'description': description,
    'source[type]': 'promptpay',
    'metadata[order_id]': orderId
  })

  return omiseFetch<OmiseChargeResult>('/charges', {
    method: 'POST',
    body
  })
}

export async function getCharge(chargeId: string): Promise<OmiseChargeResult> {
  return omiseFetch<OmiseChargeResult>(`/charges/${chargeId}`)
}
