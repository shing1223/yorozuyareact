import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchIGMediaPages } from '@/lib/ig'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  // 可用 Header 驗證 Cron
  const secret = req.headers.get('x-cron-secret')
  if (process.env.VERCEL_CRON_SECRET && secret !== process.env.VERCEL_CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 抓所有已連 IG 的商戶
  const { data: accounts, error } = await supabase.from('ig_account').select('merchant_slug, ig_user_id, access_token')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const acc of accounts ?? []) {
    let after: string | undefined
    try {
      do {
        const page = await fetchIGMediaPages({ accessToken: acc.access_token, after })
        for (const m of page.data ?? []) {
          await supabase.from('ig_media').upsert({
            ig_media_id: m.id,
            merchant_slug: acc.merchant_slug,
            ig_user_id: acc.ig_user_id,
            media_type: m.media_type,
            media_url: m.media_url,
            permalink: m.permalink,
            caption: m.caption,
            timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : null,
            thumbnail_url: m.thumbnail_url ?? null,
            children: m.children ?? null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'ig_media_id' })
        }
        after = page.paging?.cursors?.after
      } while (after)
    } catch (e: any) {
      console.error('[sync] failed merchant', acc.merchant_slug, e?.message)
    }
  }

  return NextResponse.json({ ok: true })
}