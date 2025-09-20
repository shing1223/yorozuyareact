// app/api/checkout/offline/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

async function sb() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options })
          })
        },
      },
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
    const {
      customer, shipping, note, items,
    }: {
      customer: { name: string; email: string; phone: string }
      shipping: { country: string; city: string; address: string; postal_code?: string }
      note?: string
      items: CartItem[]
    } = payload

    if (!customer?.name || !customer?.email || !customer?.phone)
      return NextResponse.json({ error: 'bad_request', detail: 'missing customer' }, { status: 400 })
    if (!shipping?.country || !shipping?.city || !shipping?.address)
      return NextResponse.json({ error: 'bad_request', detail: 'missing shipping' }, { status: 400 })
    if (!Array.isArray(items) || items.length === 0)
      return NextResponse.json({ error: 'bad_request', detail: 'empty items' }, { status: 400 })

    // 小計
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

    // 產生 code & 預先給 orderId（避開 RETURNING）
    const orderCode = Math.random().toString(36).slice(2, 8).toUpperCase()
    const orderId = crypto.randomUUID()

    const supabase = await sb()
    const { data: authUser } = await supabase.auth.getUser()

    // 1) 插入 orders —— 不要 .select()、不要 options.returning
    {
      const { error } = await supabase
        .from('orders')
        .insert({
          id: orderId,
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
        }) // ← 沒有 .select()，自帶 return=minimal
      if (error) {
        return NextResponse.json({ error: 'create_order_failed', detail: error.message }, { status: 500 })
      }
    }

    // 2) 插入 order_items —— 同樣不要 .select() / options.returning
    const rows = items.map((it: CartItem) => ({
      order_id: orderId,
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
    {
      const { error } = await supabase.from('order_items').insert(rows)
      if (error) {
        return NextResponse.json({ error: 'create_items_failed', detail: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true, order_code: orderCode })
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 })
  }
}