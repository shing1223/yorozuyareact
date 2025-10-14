// app/api/stripe/connect/callback/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get("account_id")
  const merchant = searchParams.get("merchant")

  if (!accountId || !merchant) {
    return NextResponse.redirect(new URL("/dashboard?stripe=missing", req.url))
  }

  await supabaseAdmin
    .from("merchants")
    .update({ stripe_account_id: accountId })
    .eq("slug", merchant)

  return NextResponse.redirect(new URL("/dashboard?stripe=connected", req.url))
}