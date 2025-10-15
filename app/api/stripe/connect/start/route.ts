// app/api/stripe/connect/start/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs' // 確保不是 Edge

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const SITE_URL = process.env.SITE_URL!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 直接用 fetch 打 PostgREST，避免 SDK header 被吃掉
async function pgrest<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SR_KEY,                                 // ✅ 關鍵 1
      Authorization: `Bearer ${SR_KEY}`,              // ✅ 關鍵 2
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`PostgREST ${res.status}: ${txt || res.statusText}`)
  }
  // 204 沒內容
  if (res.status === 204) return null as T
  return res.json() as Promise<T>
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const merchant = (searchParams.get('merchant') || '').trim().toLowerCase()
    if (!merchant) return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)

    // 1) 取商戶（只要 slug, stripe_account_id）
    const rows = await pgrest<Array<{ slug: string; stripe_account_id: string | null }>>(
      `/merchants?select=slug,stripe_account_id&slug=eq.${encodeURIComponent(merchant)}`
    )
    const m = rows?.[0]
    if (!m) {
      return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
    }

    // 2) 無帳戶就建立並寫回
    let accountId = m.stripe_account_id || null
    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: 'express',
        country: 'HK', // 依你的商戶地區
        metadata: { merchant_slug: merchant },
        capabilities: { transfers: { requested: true } },
      })
      accountId = acct.id

      await pgrest(`/merchants?slug=eq.${encodeURIComponent(merchant)}`, {
        method: 'PATCH',
        body: JSON.stringify({ stripe_account_id: accountId }),
      })
    }

    // 3) 產生 Onboarding Link（注意 return_url 指向 callback）
    const link = await stripe.accountLinks.create({
      account: accountId!,
      type: 'account_onboarding',
      refresh_url: `${SITE_URL}/dashboard?stripe=refresh`,
      return_url: `${SITE_URL}/api/stripe/connect/callback?merchant=${merchant}`,
    })

    return NextResponse.redirect(link.url, { status: 303 })
  } catch (err: any) {
    console.error('[connect/start] error:', err?.message || err)
    return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
  }
}