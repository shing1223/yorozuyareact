// app/api/checkout/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Next 15：提供 getAll/setAll
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

function genOrderCode() {
  // 8 碼：年月日+隨機（也可換成更人性化的碼）
  return Math.random().toString(36).slice(2, 6).toUpperCase() +
         Math.random().toString(36).slice(2, 6).toUpperCase()
}

type Incoming = {
  customer_name: string
  customer_email: string
  customer_phone: string
  shipping_address: { country: string; city: string; address: string; postal_code: string }
  note?: string
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
  const supabase = await sb()
  const body = (await req.json()) as Incoming

  if (!body?.items?.length) {
    return NextResponse.json({ error: 'empty_cart' }, { status: 400 })
  }
  if (!body.customer_name || !body.customer_email || !body.customer_phone) {
    return NextResponse.json({ error: 'bad_request', detail: 'missing customer fields' }, { status: 400 })
  }

  // 取得登入者（可為 null）
  const { data: userRes } = await supabase.auth.getUser()
  const user_id = userRes?.user?.id ?? null

  // 小計（依幣別 & 依商戶）
  const totalsByCurrency = new Map<string, number>()
  const totalsByMerchant = new Map<string, Map<string, number>>() // merchant -> currency -> total

  for (const it of body.items) {
    const cur = it.currency ?? 'HKD'
    const price = typeof it.price === 'number' ? it.price : 0
    const line = price * (it.qty || 1)
    totalsByCurrency.set(cur, (totalsByCurrency.get(cur) || 0) + line)

    const mm = totalsByMerchant.get(it.merchant_slug) || new Map<string, number>()
    mm.set(cur, (mm.get(cur) || 0) + line)
    totalsByMerchant.set(it.merchant_slug, mm)
  }

  const currency_totals = Object.fromEntries(totalsByCurrency.entries())
  const merchant_totals = Object.fromEntries(
    Array.from(totalsByMerchant.entries()).map(([m, mp]) => [m, Object.fromEntries(mp.entries())])
  )

  const order_code = genOrderCode()

  // 插入 orders
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
      payment_method: 'OFFLINE',
      payment_status: 'UNPAID',
      currency_totals,
      merchant_totals,
    })
    .select('id, order_code')
    .maybeSingle()

  if (insErr || !ins) {
    return NextResponse.json({ error: 'create_order_failed', detail: insErr?.message }, { status: 500 })
  }

  // 插入 order_items
  const itemsRows = body.items.map(it => ({
    order_id: ins.id,
    merchant_slug: it.merchant_slug,
    ig_media_id: it.ig_media_id,
    title: it.title,
    image: it.image,
    permalink: it.permalink ?? null,
    caption: it.caption ?? null,
    price: typeof it.price === 'number' ? it.price : 0,
    currency: it.currency ?? 'HKD',
    qty: it.qty || 1,
  }))

  const { error: itemsErr } = await supabase.from('order_items').insert(itemsRows)
  if (itemsErr) {
    return NextResponse.json({ error: 'create_items_failed', detail: itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, order_code: ins.order_code })
}