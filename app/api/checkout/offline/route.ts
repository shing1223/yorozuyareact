// app/api/checkout/offline/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// --- Supabase server client（Next 15：cookies getAll/setAll） ---
async function sb() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

// 產生 8 碼訂單編號
function genOrderCode() {
  return (
    Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
  )
}

// 安全數值
const asInt = (v: unknown, d = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.floor(n) : d
}
const asMoney = (v: unknown, d = 0) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : d
}

// 型別（與前端一致）
type CartItemInput = {
  merchant_slug: string
  ig_media_id: string
  title: string
  image: string
  permalink?: string
  caption?: string
  price?: number
  currency?: string
  qty: number
}

type Incoming = {
  customer: { name: string; email: string; phone: string }
  shipping: { country: string; city: string; address: string; postal_code?: string }
  note?: string
  items: CartItemInput[]
}

export async function POST(req: Request) {
  try {
    const supabase = await sb()
    const body = (await req.json()) as Incoming

    // --- 驗證 ---
    if (!body?.items?.length) {
      return NextResponse.json({ error: 'empty_cart' }, { status: 400 })
    }
    if (
      !body.customer?.name?.trim() ||
      !body.customer?.email?.trim() ||
      !body.customer?.phone?.trim()
    ) {
      return NextResponse.json(
        { error: 'bad_request', detail: 'missing customer fields' },
        { status: 400 }
      )
    }
    if (
      !body.shipping?.country?.trim() ||
      !body.shipping?.city?.trim() ||
      !body.shipping?.address?.trim()
    ) {
      return NextResponse.json(
        { error: 'bad_request', detail: 'missing shipping fields' },
        { status: 400 }
      )
    }

    // 取得登入者（可為 null）
    const { data: userRes } = await supabase.auth.getUser()
    const user_id = userRes?.user?.id ?? null

    // --- 計算合計：依幣別、依商戶 ---
    const totalsByCurrency = new Map<string, number>()
    const totalsByMerchant = new Map<string, Map<string, number>>() // merchant -> currency -> total

    for (const raw of body.items) {
      const cur = (raw.currency || 'HKD').toUpperCase()
      const price = asMoney(raw.price, 0)
      const qty = Math.max(1, asInt(raw.qty, 1))
      const line = price * qty

      totalsByCurrency.set(cur, (totalsByCurrency.get(cur) || 0) + line)

      const perMerchant = totalsByMerchant.get(raw.merchant_slug) || new Map<string, number>()
      perMerchant.set(cur, (perMerchant.get(cur) || 0) + line)
      totalsByMerchant.set(raw.merchant_slug, perMerchant)
    }

    const currency_totals = Object.fromEntries(totalsByCurrency.entries())
    const merchant_totals = Object.fromEntries(
      Array.from(totalsByMerchant.entries()).map(([m, mp]) => [m, Object.fromEntries(mp.entries())])
    )

    const order_code = genOrderCode()

    // --- 建立 orders ---
    const { data: ins, error: insErr } = await supabase
      .from('orders')
      .insert({
        order_code,
        user_id,
        customer_name: body.customer.name.trim(),
        customer_email: body.customer.email.trim(),
        customer_phone: body.customer.phone.trim(),
        shipping_address: {
          country: body.shipping.country.trim(),
          city: body.shipping.city.trim(),
          address: body.shipping.address.trim(),
          postal_code: body.shipping.postal_code?.trim() || '',
        },
        note: body.note?.trim() || null,
        payment_method: 'OFFLINE', // 線下支付
        payment_status: 'UNPAID',  // 等待商戶對帳
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

    // --- 建立 order_items ---
    const itemsRows = body.items.map((it) => ({
      order_id: ins.id,
      merchant_slug: it.merchant_slug,
      ig_media_id: it.ig_media_id,
      title: it.title,
      image: it.image,
      permalink: it.permalink ?? null,
      caption: it.caption ?? null,
      price: asMoney(it.price, 0),
      currency: (it.currency || 'HKD').toUpperCase(),
      qty: Math.max(1, asInt(it.qty, 1)),
    }))

    const { error: itemsErr } = await supabase.from('order_items').insert(itemsRows)
    if (itemsErr) {
      return NextResponse.json(
        { error: 'create_items_failed', detail: itemsErr.message },
        { status: 500 }
      )
    }

    // ✅ 成功
    return NextResponse.json({ ok: true, order_code: ins.order_code })
  } catch (e: any) {
    return NextResponse.json(
      { error: 'internal_error', detail: e?.message || String(e) },
      { status: 500 }
    )
  }
}