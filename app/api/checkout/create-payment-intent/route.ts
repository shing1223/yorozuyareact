import { NextResponse } from "next/server"
import Stripe from "stripe"

export const runtime = "nodejs"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

type CartItem = {
  merchant_slug: string
  connected_account_id: string   // 商户的 Connect 帐号 ID（acct_...）
  unit_amount: number            // 分（cents）
  quantity: number
  title: string
}

function groupByMerchant(items: CartItem[]) {
  const map = new Map<string, { account: string; subtotal: number; items: CartItem[] }>()
  for (const it of items) {
    const key = it.merchant_slug
    if (!map.has(key)) map.set(key, { account: it.connected_account_id, subtotal: 0, items: [] })
    const cur = map.get(key)!
    cur.subtotal += it.unit_amount * it.quantity
    cur.items.push(it)
  }
  return map
}

export async function POST(req: Request) {
  const { items, currency = "HKD", orderId } = await req.json() as {
    items: CartItem[]
    currency?: string
    orderId: string           // 你平台订单号（UUID）
  }

  const perMerchant = groupByMerchant(items)
  const grandTotal = Array.from(perMerchant.values()).reduce((s, m) => s + m.subtotal, 0)

  // 你也可以把每个商户小计 & 抽成比例，塞在 metadata，Webhook 用得到
  const metadata: Record<string, string> = {
    order_id: orderId,
    merchants: JSON.stringify(
      Array.from(perMerchant.entries()).map(([slug, v]) => ({
        slug, account: v.account, subtotal: v.subtotal
      }))
    ),
  }

  const pi = await stripe.paymentIntents.create({
    amount: grandTotal,
    currency,
    automatic_payment_methods: { enabled: true },
    metadata,
  })

  return NextResponse.json({ client_secret: pi.client_secret })
}