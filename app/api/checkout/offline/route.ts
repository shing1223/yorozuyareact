// app/api/checkout/offline/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// 讓 sb 可接受 orderCode，帶到 global.headers
async function sb(orderCode?: string) {
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
      ...(orderCode ? { global: { headers: { 'X-Order-Code': orderCode } } } : {}),
    }
  )
}

type CartItem = {
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

export async function POST(req: Request) {
  try {
    const payload = await req.json()

    // === 基礎驗證 ===
    const {
      customer,
      shipping,
      note,
      items,
    }: {
      customer: { name: string; email: string; phone: string }
      shipping: { country: string; city: string; address: string; postal_code?: string }
      note?: string
      items: CartItem[]
    } = payload

    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json({ error: 'bad_request', detail: 'missing customer' }, { status: 400 })
    }
    if (!shipping?.country || !shipping?.city || !shipping?.address) {
      return NextResponse.json({ error: 'bad_request', detail: 'missing shipping' }, { status: 400 })
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'bad_request', detail: 'empty items' }, { status: 400 })
    }

    // === 計算小計（分幣別 & 分商戶+幣別）===
    const currencyTotals: Record<string, number> = {}
    const merchantTotals: Record<string, Record<string, number>> = {}

    for (const it of items) {
      const cur = (it.currency || 'HKD').toUpperCase()
      const p = typeof it.price === 'number' ? it.price : 0
      const line = p * Math.max(1, Number(it.qty || 1))
      currencyTotals[cur] = (currencyTotals[cur] || 0) + line

      merchantTotals[it.merchant_slug] ??= {}
      merchantTotals[it.merchant_slug][cur] =
        (merchantTotals[it.merchant_slug][cur] || 0) + line
    }

    // 產生對客人的短碼（要先有它，才能帶到 header）
    const orderCode = Math.random().toString(36).slice(2, 8).toUpperCase()

    // 用帶有 X-Order-Code 的 client（配合 orders 的 SELECT RLS）
    const supabase = await sb(orderCode)

    const { data: authUser } = await supabase.auth.getUser()

    // 建立 orders（RETURNING 需要符合 SELECT policy）
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .insert({
        order_code: orderCode,
        user_id: authUser.user?.id ?? null,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        shipping_address: shipping,
        note: note ?? null,
        payment_method: 'OFFLINE',
        payment_status: 'UNPAID',
        currency_totals: currencyTotals,
        merchant_totals: merchantTotals,
      })
      .select('id, order_code')
      .single()

    if (oErr || !order) {
      return NextResponse.json({ error: 'create_order_failed', detail: oErr?.message }, { status: 500 })
    }

    // 建立 order_items
    const rows = items.map((it: CartItem) => ({
      order_id: order.id,
      merchant_slug: it.merchant_slug,
      ig_media_id: it.ig_media_id,
      title: it.title,
      image: it.image,
      permalink: it.permalink ?? null,
      caption: it.caption ?? null,
      price: typeof it.price === 'number' ? it.price : 0,
      currency: (it.currency || 'HKD').toUpperCase(),
      qty: Math.max(1, Number(it.qty || 1)),
    }))

    const { error: iErr } = await supabase.from('order_items').insert(rows)
    if (iErr) {
      return NextResponse.json({ error: 'create_items_failed', detail: iErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, order_code: order.order_code })
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 })
  }
}