// app/api/ig/sync/route.ts
import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const sb = await getServerSupabase()

  const url = new URL(req.url)
  const merchant =
    url.searchParams.get('merchant') ||
    String((await req.formData()).get('merchant') || '')

  if (!merchant) {
    return NextResponse.json({ error: 'bad_request', detail: 'missing merchant' }, { status: 400 })
  }

  const { data: acct, error: selErr } = await sb
    .from('ig_account')
    .select('merchant_slug, ig_user_id, access_token')
    .eq('merchant_slug', merchant)
    .maybeSingle()

  if (selErr) return NextResponse.json({ error: 'select_failed', detail: selErr.message }, { status: 500 })
  if (!acct)  return NextResponse.json({ error: 'no_account' }, { status: 404 })

  // 先刷新 IG 使用者頭像到 ig_account（不動 merchants）
  let avatarRefreshed = false
  try {
    const rMe = await fetch(
      `https://graph.instagram.com/${acct.ig_user_id}?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(acct.access_token)}`
    )
    const me: any = await rMe.json().catch(() => ({}))
    if (rMe.ok && me?.profile_picture_url) {
      const { error: upErr } = await sb
        .from('ig_account')
        .update({ profile_picture_url: me.profile_picture_url })
        .eq('merchant_slug', acct.merchant_slug)
      if (!upErr) avatarRefreshed = true
    }
  } catch {
    // 忽略頭像刷新失敗，不中斷媒體同步
  }

  // 抓取 media 並 upsert
  let nextURL: URL | null = new URL(`https://graph.instagram.com/${acct.ig_user_id}/media`)
  nextURL.searchParams.set(
    'fields',
    'id,media_type,media_url,thumbnail_url,caption,permalink,timestamp,children{media_type,media_url,thumbnail_url}'
  )
  nextURL.searchParams.set('access_token', acct.access_token)

  let inserted = 0

  while (nextURL) {
    const r = await fetch(nextURL.toString())
    const j: any = await r.json().catch(() => ({}))
    if (!r.ok) {
      return NextResponse.json(
        { error: 'ig_fetch_failed', detail: j?.error?.message || r.statusText },
        { status: 502 }
      )
    }

    for (const m of j.data ?? []) {
      await sb.from('ig_media').upsert(
        {
          ig_media_id: m.id,
          merchant_slug: acct.merchant_slug,
          ig_user_id: acct.ig_user_id,
          media_type: m.media_type,
          media_url: m.media_url,
          thumbnail_url: m.thumbnail_url ?? null,
          caption: m.caption ?? null,
          permalink: m.permalink,
          timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : null,
          children: m.children ?? null,
        },
        { onConflict: 'ig_media_id' }
      )
      inserted++
    }

    nextURL = j.paging?.next ? new URL(j.paging.next) : null
  }

  return NextResponse.json({ ok: true, merchant, inserted, avatarRefreshed })
}