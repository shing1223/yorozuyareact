import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  const form = await req.formData()
  const merchant = String(form.get('merchant') || '')
  const ig_media_id = String(form.get('ig_media_id') || '')

  if (!merchant || !ig_media_id) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  // 若已存在 → 反轉 is_published；否則建立並設為 true
  const { data: exists } = await sb.from('media_selection')
    .select('is_published')
    .eq('merchant_slug', merchant)
    .eq('ig_media_id', ig_media_id)
    .maybeSingle()

  if (exists) {
    const { error } = await sb.from('media_selection')
      .update({ is_published: !exists.is_published, selected_at: new Date().toISOString() })
      .eq('merchant_slug', merchant).eq('ig_media_id', ig_media_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await sb.from('media_selection').insert({
      merchant_slug: merchant,
      ig_media_id,
      is_published: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 回到上一頁（防止重送）
  return NextResponse.redirect(new URL('/dashboard', new URL(req.url).origin), { status: 303 })
}

export const dynamic = 'force-dynamic'