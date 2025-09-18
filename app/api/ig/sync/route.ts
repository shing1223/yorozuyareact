// app/api/ig/sync/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  const form = await req.formData()
  const merchant = (form.get('merchant') as string) || 'shop1'

  const { data: acct, error } = await supabase
    .from('ig_account')
    .select('ig_user_id, access_token')
    .eq('merchant_slug', merchant)
    .maybeSingle()
  if (error || !acct) return NextResponse.json({ error: 'no_account' }, { status: 400 })

  let after: string | undefined
  do {
    const url = new URL(`https://graph.instagram.com/${acct.ig_user_id}/media`)
    url.searchParams.set('fields', 'id,media_type,media_url,thumbnail_url,caption,timestamp,permalink')
    url.searchParams.set('access_token', acct.access_token)
    if (after) url.searchParams.set('after', after)

    const r = await fetch(url.toString())
    const j = await r.json()
    if (!r.ok) return NextResponse.json({ error: 'fetch_media_failed', detail: j.error?.message }, { status: 500 })

    for (const m of j.data ?? []) {
      await supabase.from('ig_media').upsert({
        merchant_slug: merchant,
        ig_media_id: m.id,
        media_type: m.media_type,
        media_url: m.media_url,
        thumbnail_url: m.thumbnail_url ?? null,
        caption: m.caption ?? null,
        permalink: m.permalink ?? null,
        timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : null
      }, { onConflict: 'ig_media_id' })
    }

    after = j.paging?.cursors?.after
  } while (after)

  return NextResponse.json({ ok: true })
}