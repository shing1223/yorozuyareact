// app/api/stripe/connect/callback/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const SITE_URL = process.env.SITE_URL!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function pgrest<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SR_KEY,
      Authorization: `Bearer ${SR_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`PostgREST ${res.status}: ${txt || res.statusText}`)
  }
  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const merchant = (searchParams.get('merchant') || '').trim().toLowerCase()
    if (!merchant) return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)

    // 取 account_id
    const rows = await pgrest<Array<{ stripe_account_id: string | null }>>(
      `/merchants?select=stripe_account_id&slug=eq.${encodeURIComponent(merchant)}`
    )
    const accountId = rows?.[0]?.stripe_account_id
    if (!accountId) {
      return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
    }

    // 查 Stripe 帳戶最新狀態
    const acct = await stripe.accounts.retrieve(accountId)

    await pgrest(`/merchants?slug=eq.${encodeURIComponent(merchant)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stripe_charges_enabled: !!acct.charges_enabled,
        stripe_payouts_enabled: !!acct.payouts_enabled,
        stripe_details_submitted: !!acct.details_submitted,
      }),
    })

    return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=done`)
  } catch (err: any) {
    console.error('[connect/callback] error:', err?.message || err)
    return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
  }
}