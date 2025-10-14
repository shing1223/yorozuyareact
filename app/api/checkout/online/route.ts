// app/api/checkout/online/route.ts
import { NextResponse } from "next/server"

// 不要帶 apiVersion（避免型別不匹配），確保已安裝：pnpm add stripe
import Stripe from "stripe"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

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

const ZERO_DECIMAL = new Set(["JPY", "KRW", "TWD"]) // 其餘常見：HKD/USD 都是 2 位小數
const toAmount = (currency: string, n: number) =>
  ZERO_DECIMAL.has(currency) ? Math.round(n) : Math.round(n * 100)

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
    const total = body.items.reduce((sum, it) => {
      const p = typeof it.price === "number" ? it.price : 0
      return sum + p * (it.qty || 1)
    }, 0)
    if (total <= 0) {
      return NextResponse.json({ error: "zero_total_not_supported" }, { status: 400 })
    }

    const STRIPE_SECRET_KEY = requireEnv("STRIPE_SECRET_KEY")
    const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

    const stripe = new Stripe(STRIPE_SECRET_KEY)

    // 建立訂單編號（你也可先寫入 DB，再把 order_id / order_code 放 metadata）
    const orderCode = genOrderCode()

    // 轉成 Stripe line_items
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

    // 可選：先在 DB 建立 orders / order_items（沿用你 offline 的邏輯）
    // 若要這步，建議把 order_code / user_id 等存在 Stripe metadata，webhook 會用得到。

   const session = await stripe.checkout.sessions.create({
  mode: "payment",

  // 每個商品明細
  line_items,

  // Stripe 要求金額單位在 line_items 裡；這裡補上 currency 是保險
  currency: currency.toLowerCase(),

  // 成功/失敗導回網址
  success_url: `${SITE_URL}/checkout/success?order=${orderCode}&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${SITE_URL}/checkout?canceled=1`,

  // ✅ 預填購買者資料
  customer_email: body.customer?.email || undefined,
  phone_number_collection: { enabled: true },
  shipping_address_collection: {
    allowed_countries: ["HK", "TW", "US", "CN", "MO", "JP", "KR"],
  },

  // ✅ 自訂資料（Session 層級）
  metadata: {
    order_code: orderCode,
    note: body.note || "",
  },

  // ✅ 關鍵：PaymentIntent 也帶入 metadata
  payment_intent_data: {
    metadata: {
      order_code: orderCode,
      note: body.note || "",
    },
  },
});

    if (!session?.url) {
      return NextResponse.json({ error: "create_session_failed" }, { status: 500 })
    }

    return NextResponse.json({ url: session.url, order_code: orderCode })
  } catch (e: any) {
    console.error("checkout/online error:", e)
    return NextResponse.json(
      { error: "stripe_init_failed", detail: e?.message || String(e) },
      { status: 500 }
    )
  }
}