// app/api/stripe/connect/start/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseServer } from "@/lib/supabase-server"

function siteUrl(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
  if (env) return env
  const u = new URL(req.url)
  return `${u.protocol}//${u.host}`
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.redirect(new URL("/login?redirect=/dashboard", req.url))
  }

  const merchant = new URL(req.url).searchParams.get("merchant")?.toLowerCase()
  if (!merchant) {
    return NextResponse.json({ error: "missing_merchant" }, { status: 400 })
  }

  // 僅允許 owner
  const { data: mem } = await supabase
    .from("membership")
    .select("role")
    .eq("user_id", session.user.id)
    .eq("merchant_id", merchant)
    .maybeSingle()
  if (!mem || mem.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const { data: m } = await supabase
    .from("merchants")
    .select("stripe_account_id")
    .eq("slug", merchant)
    .maybeSingle()

  let accountId = m?.stripe_account_id as string | null

  if (!accountId) {
    // 建立 Connected Account（Express）
    const acct = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      // 你可根據商戶國別設定 country；未提供就由 Stripe 判定
      // country: "HK",
      // 可選：先帶使用者 email，較好 autofill
      email: session.user.email ?? undefined,
    })
    accountId = acct.id
    await supabase
      .from("merchants")
      .update({ stripe_account_id: accountId })
      .eq("slug", merchant)
  }

  const base = siteUrl(req)
  const returnUrl = `${base}/api/stripe/connect/return?merchant=${merchant}`
  const refreshUrl = `${base}/api/stripe/connect/start?merchant=${merchant}`

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  })

  return NextResponse.redirect(link.url, { status: 303 })
}