// app/api/checkout/online/route.ts
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
const ZERO_DECIMAL = new Set(["JPY", "KRW", "TWD"]) // HKD/USD -> 2 decimals
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
// 建議統一用 SITE_URL（若你現在線上用 NEXT_PUBLIC_SITE_URL，也會 fallback）
const SITE_URL = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

const stripe = new Stripe(STRIPE_SECRET_KEY)
// 重要：用 Service Role 寫 DB，避免 RLS/權限問題
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

    // 單一幣別 & 金額 > 0
    const currencySet = new Set(
      body.items.map(i => (i.currency || "HKD").toUpperCase())
    )
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

    // 產生訂單代碼（前端成功頁會用到；webhook 也用 metadata 對應）
    const orderCode = genOrderCode()

    // 先把訂單寫進 DB（UNPAID）
    const currencyTotals: Record<string, number> = { [currency]: totalMajor }
    const merchantTotals: Record<string, any> = {}
    for (const it of body.items) {
      const m = it.merchant_slug
      merchantTotals[m] = merchantTotals[m] || {}
      merchantTotals[m][currency] = (merchantTotals[m][currency] || 0) + (it.price || 0) * (it.qty || 1)
    }

    // 建立 order
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

    // 建立 order_items（批次）
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

    // 轉換成 Stripe line_items
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = body.items.map((it) => {
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

    // 建立 Stripe Checkout Session（把 order_code 寫進 session & payment_intent 的 metadata）
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
      metadata: {
        order_code: orderCode,
        note: body.note || "",
      },
      payment_intent_data: {
        metadata: {
          order_code: orderCode,
          note: body.note || "",
        },
      },
    })

    if (!session?.url) {
      throw new Error("create_session_failed")
    }

    // 回寫 session id，讓你在訂單列表/除錯時更容易對照
    await db.from("orders")
      .update({ stripe_session_id: session.id })
      .eq("id", orderRow.id)

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