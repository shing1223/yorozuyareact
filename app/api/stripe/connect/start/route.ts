// app/api/stripe/connect/start/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.SITE_URL!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY!

const stripe = new Stripe(STRIPE_KEY)

// ✅ admin client：強制用 SR key，不用 cookie / session
const admin = createClient(SUPABASE_URL, SR_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  //global: { headers: { Authorization: `Bearer ${SR_KEY}` } },
})

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const merchant = (searchParams.get('merchant') || '').trim().toLowerCase()
    if (!merchant) return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)

    // 1) 讀 merchants（用 SR -> 不會被 RLS 擋）
    const { data: m, error } = await admin
      .from('merchants')
      .select('slug, stripe_account_id')
      .eq('slug', merchant)
      .maybeSingle()

    if (error) {
      console.error('[connect/start] select merchants error:', error)
      return NextResponse.json({ error: 'db_select_failed', detail: error.message }, { status: 500 })
    }
    if (!m) return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)

    // 2) 沒帳號就建立，回寫到 merchants
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
        return NextResponse.json({ error: 'db_update_failed', detail: updErr.message }, { status: 500 })
      }
    }

    // 3) 產生 Onboarding 連結並 303 導向
    const link = await stripe.accountLinks.create({
      account: accountId!,
      type: 'account_onboarding',
      refresh_url: `${SITE_URL}/dashboard?stripe=refresh`,
      return_url: `${SITE_URL}/api/stripe/connect/callback?merchant=${merchant}`,
    })

    return NextResponse.redirect(link.url, { status: 303 })
  } catch (err: any) {
    console.error('[connect/start] unhandled error:', err)
    return NextResponse.json({ error: 'unhandled', detail: err?.message || String(err) }, { status: 500 })
  }
}