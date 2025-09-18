// app/api/public/feed/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params  // 👈 重點：等待 params

  // 你的原本查詢...
  const { data: merchant } = await supabaseAdmin
    .from('merchant')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!merchant) {
    return NextResponse.json({ items: [] })
  }

  const { data } = await supabaseAdmin
    .from('media_selection')
    .select('order_index, is_pinned, ig_media(ig_media_id, media_type, media_url, permalink, caption, timestamp, thumbnail_url)')
    .eq('merchant_id', merchant.id)
    .order('is_pinned', { ascending: false })
    .order('order_index', { ascending: true, nullsFirst: false })
    .limit(120)

  const items = (data ?? []).map((row: any) => ({
    ...row.ig_media,
    is_pinned: row.is_pinned,
    order_index: row.order_index ?? 9999,
  }))

  return NextResponse.json(
    { merchant: slug, items },
    { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' } }
  )
}