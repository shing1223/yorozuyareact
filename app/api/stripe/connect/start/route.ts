// app/api/stripe/connect/start/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const SITE_URL = process.env.SITE_URL!

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ★ service role
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const merchant = (searchParams.get('merchant') || '').trim().toLowerCase()
  if (!merchant) return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)

  // 1) 取商戶
  const { data: m, error } = await admin
    .from('merchants')
    .select('slug, stripe_account_id')
    .eq('slug', merchant)
    .maybeSingle()
  if (error || !m) return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)

  // 2) 沒有 account 就建立；建立後立刻寫回 DB
  let accountId = m.stripe_account_id || null
  if (!accountId) {
    const acct = await stripe.accounts.create({
      type: 'express',
      country: 'HK',                // 或依你的商戶所在地
      metadata: { merchant_slug: merchant },
      capabilities: { transfers: { requested: true } } // 如需轉帳
    })
    accountId = acct.id

    const { error: updErr } = await admin
      .from('merchants')
      .update({ stripe_account_id: accountId })
      .eq('slug', merchant)

    if (updErr) return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
  }

  // 3) 建 Account Link 並導向
  const link = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: `${SITE_URL}/dashboard?stripe=refresh`,
    return_url:  `${SITE_URL}/dashboard?stripe=done`, // 或導到 callback
  })

  return NextResponse.redirect(link.url, { status: 303 })
}