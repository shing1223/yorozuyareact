// app/api/stripe/connect/return/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseServer } from "@/lib/supabase-server"

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

  // 讀取 merchants 取 account id
  const { data: m, error } = await supabase
    .from("merchants")
    .select("stripe_account_id")
    .eq("slug", merchant)
    .maybeSingle()
  if (error || !m?.stripe_account_id) {
    return NextResponse.redirect(new URL(`/dashboard?stripe=missing`, req.url))
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const acct = await stripe.accounts.retrieve(m.stripe_account_id)

  await supabase
    .from("merchants")
    .update({
      stripe_charges_enabled: !!acct.charges_enabled,
      stripe_payouts_enabled: !!acct.payouts_enabled,
      stripe_details_submitted: !!acct.details_submitted,
    })
    .eq("slug", merchant)

  return NextResponse.redirect(new URL(`/dashboard?stripe=connected`, req.url))
}