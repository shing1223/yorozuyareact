// app/api/stripe/connect/start/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.SITE_URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY

// 提前檢查環境變數（少了任何一個都會 500）
function assertEnv() {
  const missing: string[] = []
  if (!SITE_URL) missing.push('SITE_URL')
  if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!SR_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!STRIPE_KEY) missing.push('STRIPE_SECRET_KEY')
  if (missing.length) {
    const msg = `Missing env: ${missing.join(', ')}`
    console.error('[connect/start] ', msg)
    return NextResponse.json({ error: 'env_missing', detail: msg }, { status: 500 })
  }
  return null
}

export async function GET(req: Request) {
  const envErr = assertEnv()
  if (envErr) return envErr

  const stripe = new Stripe(STRIPE_KEY!)
  const admin = createClient(SUPABASE_URL!, SR_KEY!, { auth: { persistSession: false } })

  try {
    const { searchParams } = new URL(req.url)
    const merchant = (searchParams.get('merchant') || '').trim().toLowerCase()
    if (!merchant) {
      return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
    }

    // 1) 取得商戶
    const { data: m, error } = await admin
      .from('merchants')
      .select('slug, stripe_account_id')
      .eq('slug', merchant)
      .maybeSingle()

    if (error) {
      console.error('[connect/start] select merchants error:', error)
      return NextResponse.json({ error: 'db_select_failed', detail: error.message }, { status: 500 })
    }
    if (!m) {
      return NextResponse.redirect(`${SITE_URL}/dashboard?stripe=missing`)
    }

    // 2) 沒有 account 就建立；建立後立刻寫回 DB（用 service role，不會被 RLS 擋）
    let accountId = m.stripe_account_id || null
    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: 'express',
        country: 'HK', // 需要可依商戶決定
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

    // 3) 建立 Account Link 並導向
    const link = await stripe.accountLinks.create({
      account: accountId!,
      type: 'account_onboarding',
      refresh_url: `${SITE_URL}/dashboard?stripe=refresh`,
      return_url: `${SITE_URL}/dashboard?stripe=done`,
    })

    return NextResponse.redirect(link.url, { status: 303 })
  } catch (err: any) {
    console.error('[connect/start] unhandled error:', err)
    return NextResponse.json(
      { error: 'unhandled', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}