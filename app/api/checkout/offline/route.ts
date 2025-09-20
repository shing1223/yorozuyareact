// app/api/checkout/offline/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function genCode(len = 6) {
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: len }, () => ABC[Math.floor(Math.random() * ABC.length)]).join('')
}

export async function POST(req: Request) {
  // A) 這個 client 用來「插入」，強制 minimal 回應（避免 SELECT RLS）
  const supabaseMinimal = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Prefer: 'return=minimal' } } }          // ← 只回 201 無資料
  )

  // B) 這個 client 用來「查詢」，帶 X-Order-Code 以符合你的 SELECT policy
  const body = await req.json()
  const order_code = genCode()

  // ① 建立主檔（**不要** .select()，也**不要**傳 returning）
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

  // ② 用帶 X-Order-Code 的 client 依照 X-Order-Code 取回 id（符合你的 SELECT policy）
  // ② 用 REST + 明確 headers 查回 id（單物件格式）
const REST = `${process.env.NEXT_PUBLIC_SUPABASE_URL!}/rest/v1/orders`
const apikey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const r = await fetch(`${REST}?select=id&order_code=eq.${encodeURIComponent(order_code)}`, {
  method: 'GET',
  headers: {
    apikey,
    Authorization: `Bearer ${apikey}`,                     // 用 anon key 即可
    'X-Order-Code': order_code,                            // ✅ 讓 RLS policy 放行
    Accept: 'application/vnd.pgrst.object+json'            // ✅ 要求單物件回傳（0 或 >1 會 406/409）
  }
})

// 0 筆或 >1 筆會不是 200；統一當作查無
if (!r.ok) {
  const msg = await r.text().catch(() => r.statusText)
  return NextResponse.json(
    { error: 'fetch_order_failed', detail: msg || 'no row matched X-Order-Code' },
    { status: 400 }
  )
}

const orderOnce: { id: string } = await r.json()

  // ③ 明細（同樣用 minimal client；傳入「陣列」）
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
    qty: it.qty ?? 1,
  })) as any[]                                                         // ← 明確是陣列，對應 insert 的 overload 2

  const { error: iErr } = await supabaseMinimal
    .from('order_items')
    .insert(rows)
  if (iErr) {
    return NextResponse.json({ error: 'insert_items_failed', detail: iErr.message }, { status: 400 })
  }

  // ④ 成功
  return NextResponse.json({ ok: true, order_code })
}