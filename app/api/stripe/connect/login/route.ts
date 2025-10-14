// app/api/stripe/connect/login/route.ts
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const merchant = searchParams.get("merchant")
  if (!merchant) return NextResponse.json({ error: "missing_merchant" }, { status: 400 })

  const { data } = await supabaseAdmin
    .from("merchants")
    .select("stripe_account_id")
    .eq("slug", merchant)
    .maybeSingle()

  if (!data?.stripe_account_id) {
    return NextResponse.redirect(new URL(`/dashboard?stripe=missing`, req.url))
  }

  const link = await stripe.accounts.createLoginLink(data.stripe_account_id)
  return NextResponse.redirect(link.url)
}