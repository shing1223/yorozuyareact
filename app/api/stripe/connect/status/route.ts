// app/api/stripe/connect/status/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseServer } from "@/lib/supabase-server"

export async function GET(req: Request) {
  const supabase = await createSupabaseServer()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const merchant = new URL(req.url).searchParams.get("merchant")?.toLowerCase()
  if (!merchant) return NextResponse.json({ error: "missing_merchant" }, { status: 400 })

  const { data: m } = await supabase
    .from("merchants")
    .select("stripe_account_id")
    .eq("slug", merchant)
    .maybeSingle()

  if (!m?.stripe_account_id) return NextResponse.json({ linked: false })

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

  return NextResponse.json({
    linked: true,
    account_id: acct.id,
    charges_enabled: acct.charges_enabled,
    payouts_enabled: acct.payouts_enabled,
    details_submitted: acct.details_submitted,
  })
}