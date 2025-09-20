// app/api/dashboard/product/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const ALLOWED = new Set(['HKD', 'TWD', 'USD'])
function normCurrency(input?: string | null) {
  const v = (input ?? '').toUpperCase().trim()
  return ALLOWED.has(v) ? v : 'HKD'
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ✅ 正確的 cookies 介面（getAll / setAll）
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

export async function POST(req: Request) {
  const form = await req.formData()
  const merchant = String(form.get('merchant') ?? '')
  const ig_media_id = String(form.get('ig_media_id') ?? '')
  const title = String(form.get('title') ?? '')
  const image_url = String(form.get('image_url') ?? '')
  const priceRaw = String(form.get('price') ?? '')
  const currency = normCurrency(String(form.get('currency') ?? ''))

  const price = Number(priceRaw)
  if (!merchant || !ig_media_id || !title || !isFinite(price)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const supabase = await sb()

  // 1) upsert products（需有唯一鍵：merchant_slug + title）
  // 如果你還沒建唯一索引，請先執行：
  // create unique index if not exists ux_products_merchant_title on public.products(merchant_slug, title);
  const { data: p, error: pErr } = await supabase
    .from('products')
    .upsert(
      {
        merchant_slug: merchant,   // RLS/NOT NULL 需要
        title,
        price,
        currency,                  // 若是 enum，值需為 'HKD' | 'TWD' | 'USD'
        image_url,
      },
      { onConflict: 'merchant_slug,title' }
    )
    .select('id')
    .maybeSingle()

  if (pErr || !p) {
    return NextResponse.json({ error: 'upsert_product_failed', detail: pErr?.message }, { status: 500 })
  }

  // 2) 綁定 media ↔ product（需有唯一鍵：merchant_slug + ig_media_id）
  // 若尚未建立，請先執行：
  // create unique index if not exists ux_media_product_merchant_media on public.media_product(merchant_slug, ig_media_id);
  const { error: mpErr } = await supabase
    .from('media_product')
    .upsert(
      { merchant_slug: merchant, ig_media_id, product_id: p.id },
      { onConflict: 'merchant_slug,ig_media_id' }
    )

  if (mpErr) {
    return NextResponse.json({ error: 'bind_failed', detail: mpErr.message }, { status: 500 })
  }

  const url = new URL(req.url)
  return NextResponse.redirect(new URL(`/dashboard?merchant=${merchant}`, url.origin), { status: 302 })
}