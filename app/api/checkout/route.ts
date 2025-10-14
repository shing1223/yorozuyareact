// app/api/checkout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ---------- Helpers ----------
function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

// 金额转最小货币单位（仅示范常见两位小数货币；有 0/3 位的货币可按需扩展）
function toMinor(amount: number, currency: string): number {
  const cur = currency.toUpperCase()
  const zeroDecimal = new Set(['JPY', 'KRW'])
  const threeDecimal = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']) // 需要 3 位的罕见币别，按需增删

  if (zeroDecimal.has(cur)) return Math.round(amount)
  if (threeDecimal.has(cur)) return Math.round(amount * 1000)
  return Math.round(amount * 100) // 默认 2 位小数
}

// Next 15：提供 getAll/setAll
async function sb() {
  const jar = await cookies()
  return createServerClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return jar.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options })
          })
        },
      },
    }
  )
}

function genOrderCode() {
  // 8 碼：兩段隨機
  return (
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  )
}

type Incoming = {
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: {
    country: string
    city: string
    address: string
    postal_code: string
  }
  note?: string
  success_url?: string // 可覆寫全域成功 URL
  cancel_url?: string  // 可覆寫全域取消 URL
  items: Array<{
    merchant_slug: string
    ig_media_id: string
    title: string
    image: string
    permalink?: string
    caption?: string
    price?: number
    currency?: string
    qty: number
  }>
}

export async function POST(req: Request) {
  try {
    const supabase = await sb()
    const body = (await req.json()) as Incoming

    // -------- 基本驗證 --------
    if (!body?.items?.length) {
      return NextResponse.json({ error: 'empty_cart' }, { status: 400 })
    }
    if (!body.customer_name || !body.customer_email || !body.customer_phone) {
      return NextResponse.json(
        { error: 'bad_request', detail: 'missing customer fields' },
        { status: 400 }
      )
    }

    // 取得登入者（可為 null）
    const { data: userRes } = await supabase.auth.getUser()
    const user_id = userRes?.user?.id ?? null

    // -------- 小計（依幣別 & 依商戶）--------
    const totalsByCurrency = new Map<string, number>()
    const totalsByMerchant = new Map<string, Map<string, number>>() // merchant -> currency -> total
    const currencySet = new Set<string>()

    for (const it of body.items) {
      const cur = (it.currency ?? 'HKD').toUpperCase()
      const price = typeof it.price === 'number' ? it.price : 0
      const qty = it.qty || 1
      const line = price * qty

      currencySet.add(cur)
      totalsByCurrency.set(cur, (totalsByCurrency.get(cur) || 0) + line)

      const mm = totalsByMerchant.get(it.merchant_slug) || new Map<string, number>()
      mm.set(cur, (mm.get(cur) || 0) + line)
      totalsByMerchant.set(it.merchant_slug, mm)
    }

    const currency_totals = Object.fromEntries(totalsByCurrency.entries())
    const merchant_totals = Object.fromEntries(
      Array.from(totalsByMerchant.entries()).map(([m, mp]) => [m, Object.fromEntries(mp.entries())])
    )

    // 單一幣別限制（一次 Checkout 只能一種幣別）
    if (currencySet.size !== 1) {
      return NextResponse.json(
        {
          error: 'multiple_currencies',
          detail: 'One checkout session supports a single currency. Split by currency.',
          currency_totals,
        },
        { status: 400 }
      )
    }
    const [currency] = Array.from(currencySet.values())

    const order_code = genOrderCode()

    // -------- 插入 orders（PENDING）--------
    const { data: ins, error: insErr } = await supabase
      .from('orders')
      .insert({
        order_code,
        user_id,
        customer_name: body.customer_name,
        customer_email: body.customer_email,
        customer_phone: body.customer_phone,
        shipping_address: body.shipping_address,
        note: body.note ?? null,
        payment_method: 'STRIPE',
        payment_status: 'PENDING', // 先 pending，等 webhook 改為 PAID / FAILED
        currency_totals,
        merchant_totals,
      })
      .select('id, order_code')
      .maybeSingle()

    if (insErr || !ins) {
      return NextResponse.json(
        { error: 'create_order_failed', detail: insErr?.message },
        { status: 500 }
      )
    }

    // -------- 插入 order_items（快照）--------
    const itemsRows = body.items.map((it) => ({
      order_id: ins.id,
      merchant_slug: it.merchant_slug,
      ig_media_id: it.ig_media_id,
      title: it.title,
      image: it.image,
      permalink: it.permalink ?? null,
      caption: it.caption ?? null,
      price: typeof it.price === 'number' ? it.price : 0,
      currency: (it.currency ?? 'HKD').toUpperCase(),
      qty: it.qty || 1,
    }))
    const { error: itemsErr } = await supabase.from('order_items').insert(itemsRows)
    if (itemsErr) {
      return NextResponse.json(
        { error: 'create_items_failed', detail: itemsErr.message },
        { status: 500 }
      )
    }

    // -------- 建立 Stripe Checkout Session（平台收款）--------
 const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    // 建立 line_items（僅作展示；實際結帳金額由 Stripe 計，建議與 DB 小計一致）
    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = body.items.map((it) => {
      const p = typeof it.price === 'number' ? it.price : 0
      const qty = it.qty || 1
      return {
        quantity: qty,
        price_data: {
          currency: currency,
          unit_amount: toMinor(p, currency),
          product_data: {
            name: it.title || '商品',
            images: it.image ? [it.image] : undefined,
            metadata: {
              merchant_slug: it.merchant_slug,
              ig_media_id: it.ig_media_id,
            },
          },
        },
      }
    })

    // 计算总金额（作为兜底校验，可与 totalsByCurrency[currency] 对比）
    const expectedTotal = totalsByCurrency.get(currency) || 0
    const successUrl =
      body.success_url ||
      requiredEnv('STRIPE_SUCCESS_URL').replace('{ORDER_CODE}', ins.order_code)
    const cancelUrl = body.cancel_url || requiredEnv('STRIPE_CANCEL_URL')

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency,
      line_items,
      success_url: successUrl,
      cancel_url: cancelUrl,
      // 把结算需要的信息放到 metadata，Webhook 可据此做转账/更新状态
      metadata: {
        order_id: String(ins.id),
        order_code: ins.order_code,
        currency,
        expected_total: String(toMinor(expectedTotal, currency)),
        // 仅放必要信息；大对象可在 webhook 时再从 DB 读取
      },
      // 可选：收集买家邮箱/电话（如与 body 中的不同，以 Stripe 为准或合并）
      customer_email: body.customer_email,
      // shipping_address_collection / phone_number_collection 可按需启用
    })

    // 落地 Stripe session id，备用
    await supabase
      .from('orders')
      .update({ stripe_session_id: session.id })
      .eq('id', ins.id)

    return NextResponse.json({
      ok: true,
      order_code: ins.order_code,
      stripe_session_id: session.id,
      url: session.url, // 前端可重定向到此 URL 进行付款
    })
  } catch (err: any) {
    console.error('checkout error:', err)
    return NextResponse.json(
      { error: 'internal_error', detail: err?.message || String(err) },
      { status: 500 }
    )
  }
}