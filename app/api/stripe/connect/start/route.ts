// app/api/stripe/connect/start/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'          // 確認不是 Edge

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const SITE_URL = process.env.SITE_URL!

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ✅ 關鍵：強制同時送 apikey + Authorization 兩個 header
const admin = createClient(SUPABASE_URL, SR_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    headers: {
      apikey: SR_KEY,
      Authorization: `Bearer ${SR_KEY}`,
    },
  },
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const merchant = (searchParams.get('merchant') || '').trim().toLowerCase()
  if (!merchant) return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)

  // 1) 查商戶
  const { data: m, error } = await admin
    .from('merchants')
    .select('slug, stripe_account_id')
    .eq('slug', merchant)
    .maybeSingle()

  if (error || !m) {
    // 可印出 error 幫你除錯
    console.error('[connect/start] select merchants error:', error)
    return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
  }

  // 2) 沒 account 就建立，並寫回 DB
  let accountId = m.stripe_account_id || null
  if (!accountId) {
    const acct = await stripe.accounts.create({
      type: 'express',
      country: 'HK',
      metadata: { merchant_slug: merchant },
      capabilities: { transfers: { requested: true } },
    })
    accountId = acct.id

    const { error: updErr } = await admin
      .from('merchants')
      .update({ stripe_account_id: accountId })
      .eq('slug', merchant)

    if (updErr) {
      console.error('[connect/start] update merchants error:', updErr)
      return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
    }
  }

  // 3) 建立 onboarding link 並 303 導去
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${SITE_URL}/dashboard?stripe=refresh`,
    return_url:  `${SITE_URL}/api/stripe/connect/callback?merchant=${merchant}`,
  })

  return NextResponse.redirect(link.url, { status: 303 })
}