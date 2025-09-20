// app/api/checkout/offline/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function genCode(len = 6) {
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: len }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('')
}

export async function POST(req: Request) {
  // A) 專職「插入」的 client：用 Prefer 最小回傳，避免觸發 SELECT RLS
  const supabaseMinimal = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Prefer: 'return=minimal' } } }
  )

  const body = await req.json()
  const order_code = genCode()

  // ① 建立主檔（不要 .select / 不要 returning）
  const { error: oErr } = await supabaseMinimal
    .from('orders')
    .insert({
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
    return NextResponse.json({ error: 'insert_order_failed', detail: oErr.message }, { status: 400 })
  }

  // ② 用 REST 依 RLS header 取回 id（回傳陣列自己判斷長度）
  const REST = `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/orders`
  const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const r = await fetch(`${REST}?select=id&limit=1`, {
    method: 'GET',
    headers: {
      apikey,
      Authorization: `Bearer ${apikey}`,
      'X-Order-Code': order_code, // RLS 用這個放行並過濾
      Accept: 'application/json',
    },
  })

  if (!r.ok) {
    const msg = await r.text().catch(() => r.statusText)
    return NextResponse.json({ error: 'fetch_order_failed', detail: msg || 'fetch not ok' }, { status: 400 })
  }

  const found: Array<{ id: string }> = await r.json()
  if (!found.length) {
    return NextResponse.json({ error: 'fetch_order_failed', detail: 'no row matched X-Order-Code' }, { status: 400 })
  }
  const orderOnce = found[0]

  // ③ 明細（同樣 minimal；注意變數名稱不要跟上面的 rows 打架）
  const itemRows: Array<{
    order_id: string
    merchant_slug: string
    ig_media_id: string
    title: string
    image: string
    permalink: string | null
    caption: string | null
    price: number
    currency: string
    qty: number
  }> = (body.items ?? []).map((it: any) => ({
    order_id: orderOnce.id,
    merchant_slug: String(it.merchant_slug),
    ig_media_id: String(it.ig_media_id),
    title: String(it.title),
    image: String(it.image),
    permalink: it.permalink ? String(it.permalink) : null,
    caption: it.caption ? String(it.caption) : null,
    price: typeof it.price === 'number' ? it.price : 0,
    currency: String(it.currency ?? 'HKD').toUpperCase(),
    qty: Number(it.qty ?? 1),
  }))

  if (!itemRows.length) {
    // 沒有明細也算成功，直接回傳訂單碼
    return NextResponse.json({ ok: true, order_code })
  }

  const { error: iErr } = await supabaseMinimal
    .from('order_items')
    .insert(itemRows)

  if (iErr) {
    return NextResponse.json({ error: 'insert_items_failed', detail: iErr.message }, { status: 400 })
  }

  // ④ 成功
  return NextResponse.json({ ok: true, order_code })
}