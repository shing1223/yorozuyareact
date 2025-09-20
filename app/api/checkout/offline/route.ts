// app/api/checkout/offline/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'bad_request', detail: 'no items' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('create_order_offline', {
    _customer: body.customer ?? {},
    _shipping: body.shipping ?? {},
    _note: body.note ?? '',
    _items: body.items ?? [],
  })

  if (error) {
    return NextResponse.json({ error: 'rpc_failed', detail: error.message }, { status: 400 })
  }

  // data 形如 { order_id, order_code }
  return NextResponse.json({ ok: true, ...data })
}