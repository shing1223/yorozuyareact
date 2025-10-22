import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// ---- types ----
type CartItem = {
  merchant_slug: string
  ig_media_id: string
  title: string
  image?: string | null
  permalink?: string | null
  caption?: string | null
  price?: number | null
  currency?: string | null
  qty: number
}

type Incoming = {
  customer: { name: string; email: string; phone: string }
  shipping: { country: string; city: string; address: string; postal_code?: string }
  note?: string
  items: CartItem[]
}

// ---- helpers ----
const ZERO_DECIMAL = new Set(["JPY", "KRW", "TWD"])
const toAmount = (currency: string, n: number) =>
  ZERO_DECIMAL.has(currency) ? Math.round(n) : Math.round(n * 100)

const moneyFromMinor = (currency: string, minor: number) =>
  ZERO_DECIMAL.has(currency) ? minor : Math.round(minor) / 100

function requireEnv(name: string) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function firstLine(s?: string | null) {
  return (s || "").split("\n").map(t => t.trim()).filter(Boolean)[0] || ""
}

function genOrderCode() {
  return (
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  )
}

// ---- env + clients ----
const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY")
const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

const stripe = new Stripe(STRIPE_SECRET_KEY)
const db = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Incoming
    if (!body?.items?.length) {
      return NextResponse.json({ error: "empty_cart" }, { status: 400 })
    }

    // --- 1️⃣ 驗證幣別 ---
    const currencySet = new Set(body.items.map(i => (i.currency || "HKD").toUpperCase()))
    if (currencySet.size !== 1) {
      return NextResponse.json({ error: "multi_currency_not_supported" }, { status: 400 })
    }
    const currency = Array.from(currencySet)[0]

    const totalMajor = body.items.reduce((sum, it) => {
      const p = typeof it.price === "number" ? it.price : 0
      return sum + p * (it.qty || 1)
    }, 0)
    if (totalMajor <= 0) {
      return NextResponse.json({ error: "zero_total_not_supported" }, { status: 400 })
    }

    // --- 2️⃣ 查出商戶 Stripe 子帳戶 ID ---
    const merchantSlug = body.items[0].merchant_slug // 目前以第一個商戶為主
    const { data: merchant, error: merchantErr } = await db
      .from("merchants")
      .select("stripe_account_id")
      .eq("slug", merchantSlug)
      .maybeSingle()

    if (merchantErr) throw merchantErr
    if (!merchant?.stripe_account_id) {
      throw new Error(`Merchant ${merchantSlug} missing stripe_account_id`)
    }

    const merchantStripeAccountId = merchant.stripe_account_id

    // --- 3️⃣ 建立訂單 ---
    const orderCode = genOrderCode()
    const currencyTotals: Record<string, number> = { [currency]: totalMajor }
    const merchantTotals: Record<string, any> = {}

    for (const it of body.items) {
      const m = it.merchant_slug
      merchantTotals[m] = merchantTotals[m] || {}
      merchantTotals[m][currency] =
        (merchantTotals[m][currency] || 0) + (it.price || 0) * (it.qty || 1)
    }

    const { data: orderRow, error: orderErr } = await db
      .from("orders")
      .insert({
        order_code: orderCode,
        customer_name: body.customer?.name || "",
        customer_email: body.customer?.email || "",
        customer_phone: body.customer?.phone || "",
        shipping_address: body.shipping,
        note: body.note || "",
        payment_method: "STRIPE",
        payment_status: "UNPAID",
        currency_totals: currencyTotals,
        merchant_totals: merchantTotals,
      })
      .select("id")
      .maybeSingle()

    if (orderErr || !orderRow) {
      throw new Error(orderErr?.message || "insert_order_failed")
    }

    // --- 4️⃣ 寫入 order_items ---
    const itemsRows = body.items.map(it => ({
      order_id: orderRow.id,
      merchant_slug: it.merchant_slug,
      ig_media_id: it.ig_media_id,
      title: firstLine(it.title) || `@${it.merchant_slug} 商品`,
      image: it.image || "",
      permalink: it.permalink || null,
      caption: it.caption || null,
      price: it.price ?? 0,
      currency: (it.currency || currency).toUpperCase(),
      qty: it.qty || 1,
      meta: {},
    }))
    const { error: itemsErr } = await db.from("order_items").insert(itemsRows)
    if (itemsErr) throw new Error(itemsErr.message || "insert_items_failed")

    // --- 5️⃣ Stripe line_items ---
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = body.items.map(it => {
      const unit = typeof it.price === "number" ? it.price : 0
      const qty = it.qty || 1
      const title = firstLine(it.title) || `@${it.merchant_slug} 商品`
      return {
        quantity: qty,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: toAmount(currency, unit),
          product_data: {
            name: title,
            images: it.image ? [it.image] : undefined,
            metadata: {
              merchant_slug: it.merchant_slug,
              ig_media_id: it.ig_media_id,
            },
          },
        },
      }
    })

    // --- 6️⃣ 建立 Stripe Checkout Session（含分潤設定） ---
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      currency: currency.toLowerCase(),
      success_url: `${SITE_URL}/checkout/success?order=${orderCode}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/checkout?canceled=1`,
      customer_email: body.customer?.email || undefined,
      phone_number_collection: { enabled: true },
      shipping_address_collection: {
        allowed_countries: ["HK", "TW", "US", "CN", "MO", "JP", "KR"],
      },
      metadata: { order_code: orderCode, note: body.note || "" },
      payment_intent_data: {
        metadata: { order_code: orderCode, note: body.note || "" },
        transfer_data: {
          destination: merchantStripeAccountId, // ✅ 這裡帶入子帳戶 ID
        },
      },
    })

    if (!session?.url) throw new Error("create_session_failed")

    await db.from("orders").update({ stripe_session_id: session.id }).eq("id", orderRow.id)

    return NextResponse.json({
      url: session.url,
      order_code: orderCode,
      amount_total: moneyFromMinor(currency, toAmount(currency, totalMajor)),
      currency,
    })
  } catch (e: any) {
    console.error("checkout/online error:", e)
    return NextResponse.json(
      { error: "stripe_init_failed", detail: e?.message || String(e) },
      { status: 500 }
    )
  }
}