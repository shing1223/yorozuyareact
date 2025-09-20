// app/api/dashboard/product/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

async function sb() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll() },
        setAll(list) { list.forEach(({ name, value, options }: any) => jar.set({ name, value, ...options })) },
      },
    }
  )
}

export async function POST(req: Request) {
  const supabase = await sb()
  const form = await req.formData()
  const merchant = String(form.get('merchant') ?? '')
  const ig_media_id = String(form.get('ig_media_id') ?? '')
  const title = String(form.get('title') ?? '')
  const price = Number(form.get('price') ?? '0')
  const currency = String(form.get('currency') ?? 'TWD')
  const image_url = String(form.get('image_url') ?? '')

  if (!merchant || !ig_media_id || !title || Number.isNaN(price)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // 1) upsert 商品
  const { data: prod, error: pe } = await supabase
    .from('products')
    .upsert(
      [{ merchant_slug: merchant, title, price, currency, image_url }],
      { onConflict: 'merchant_slug,title' }
    )
    .select()
    .single()

  if (pe) return NextResponse.json({ error: 'upsert_product_failed', detail: pe.message }, { status: 500 })

  // 2) 綁定 IG 媒體 ↔ 商品
  const { error: me } = await supabase
    .from('media_product')
    .upsert([{ merchant_slug: merchant, ig_media_id, product_id: prod.id }])

  if (me) return NextResponse.json({ error: 'bind_failed', detail: me.message }, { status: 500 })

  // 回到 dashboard
  const url = new URL(req.url)
  return NextResponse.redirect(new URL(`/dashboard?merchant=${merchant}`, url.origin), { status: 302 })
}