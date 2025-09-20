// app/api/checkout/offline/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function genCode(len = 6) {
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: len }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('')
}

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  const body = await req.json()
  const order_code = genCode()

  // 1) 建立主檔（不要 .select()）
  const { error: oErr } = await supabase.from('orders').insert({
    order_code,
    customer_name: body.customer?.name ?? '',
    customer_email: body.customer?.email ?? '',
    customer_phone: body.customer?.phone ?? '',
    shipping_address: body.shipping ?? {},
    note: body.note ?? '',
    payment_method: 'OFFLINE',
    payment_status: 'UNPAID',
    currency_totals: {},
    merchant_totals: {},
  })

  if (oErr) {
    return NextResponse.json(
      { error: 'insert_order_failed', detail: oErr.message ?? String(oErr) },
      { status: 400 }
    )
  }

  // 2) 用 REST + header 取回剛剛那筆的 id（讓 RLS 依 X-Order-Code 放行）
const restUrl = `${SUPABASE_URL}/rest/v1/orders?select=id&order=created_at.desc&limit=1`

const res = await fetch(restUrl, {
  method: 'GET',
  headers: {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'X-Order-Code': order_code,  // 讓 RLS 的「orders select by code」生效
    Accept: 'application/json',  // ← 拿陣列，避免 PGRST116
  },
  cache: 'no-store',
})

if (!res.ok) {
  const detail = await res.text().catch(() => '')
  return NextResponse.json(
    { error: 'fetch_order_failed', detail: detail || res.statusText },
    { status: 400 }
  )
}

const arr: Array<{ id: string }> = await res.json()
const orderOnce = Array.isArray(arr) ? arr[0] : undefined

if (!orderOnce?.id) {
  // 若還是 0 筆，通常是 header 沒帶到或 RLS 尚未生效（需 reload schema）
  return NextResponse.json(
    { error: 'fetch_order_failed', detail: 'no row matched X-Order-Code' },
    { status: 400 }
  )
}

  // 3) 建立明細（同樣不要 .select()）
  const rows = (body.items ?? []).map((it: any) => ({
    order_id: orderOnce.id,
    merchant_slug: it.merchant_slug,
    ig_media_id: it.ig_media_id,
    title: it.title,
    image: it.image,
    permalink: it.permalink ?? null,
    caption: it.caption ?? null,
    price: typeof it.price === 'number' ? it.price : 0,
    currency: String(it.currency ?? 'HKD').toUpperCase(),
    qty: Number(it.qty ?? 1),
  }))

  const { error: iErr } = await supabase.from('order_items').insert(rows)
  if (iErr) {
    return NextResponse.json(
      { error: 'insert_items_failed', detail: iErr.message ?? String(iErr) },
      { status: 400 }
    )
  }

  return NextResponse.json({ ok: true, order_code })
}