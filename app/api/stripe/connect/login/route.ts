// app/api/stripe/connect/login/route.ts
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

  const { data: m } = await supabase
    .from("merchants")
    .select("stripe_account_id")
    .eq("slug", merchant)
    .maybeSingle()

  if (!m?.stripe_account_id) {
    return NextResponse.redirect(new URL(`/dashboard?stripe=not_linked`, req.url))
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const link = await stripe.accounts.createLoginLink(m.stripe_account_id)
  return NextResponse.redirect(link.url, { status: 303 })
}