// app/api/stripe/connect/start/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.maxhse.com"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const merchant = searchParams.get("merchant")
  if (!merchant) {
    return NextResponse.json({ error: "missing_merchant" }, { status: 400 })
  }

  // 先查有沒有已經連線過
  const { data: existing } = await supabaseAdmin
    .from("merchants")
    .select("stripe_account_id")
    .eq("slug", merchant)
    .maybeSingle()

  let accountId = existing?.stripe_account_id

  // 若還沒有 → 新增一個 Stripe Express 帳號
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { merchant_slug: merchant },
    })

    accountId = account.id

    // 寫入 DB
    await supabaseAdmin
      .from("merchants")
      .update({ stripe_account_id: accountId })
      .eq("slug", merchant)
  }

  // ✅ 建立 onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${SITE_URL}/dashboard?stripe=refresh`,
    return_url: `${SITE_URL}/api/stripe/connect/callback?merchant=${merchant}`,
    type: "account_onboarding",
  })

  // 導去 Stripe Onboarding 頁面
  return NextResponse.redirect(accountLink.url)
}