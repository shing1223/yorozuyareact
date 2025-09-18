// app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic' // 避免 RSC 靜態化

type IgAccountRow = {
  ig_username: string | null
  ig_user_id: string | null
}

type IgMediaRow = {
  ig_media_id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string
  media_url: string
  thumbnail_url: string | null
  caption: string | null
  timestamp: string | null
}

export default async function DashboardHome() {
  const supabase = await createSupabaseServer()

  // 若沒有用 middleware 做驗證，這裡做一次檢查
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard')

  // TODO: 先用假資料，之後可由使用者選擇或 profile 讀取
  const merchant = 'shop1'

  const { data: acct, error: acctErr } = await supabase
    .from('ig_account')
    .select('ig_username, ig_user_id')
    .eq('merchant_slug', merchant)
    .maybeSingle<IgAccountRow>()

  if (acctErr) {
    // 你也可以把錯誤渲染在頁面
    console.error('[ig_account] query error:', acctErr.message)
  }

  const { data: medias, error: mediaErr } = await supabase
    .from('ig_media')
    .select(
      'ig_media_id, media_type, media_url, thumbnail_url, caption, timestamp'
    )
    .eq('merchant_slug', merchant)
    .order('timestamp', { ascending: false })
    .limit(60) as { data: IgMediaRow[] | null; error: any }

  if (mediaErr) {
    console.error('[ig_media] query error:', mediaErr.message)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">後台總覽</h1>

      {!acct ? (
        <div className="space-y-3">
          <p>尚未連結 Instagram。</p>
          <a
            href={`/api/ig/auth?merchant=${merchant}`}
            className="inline-flex items-center px-4 py-2 rounded bg-black text-white"
          >
            連結 Instagram
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <p>
            已連結 IG：<b>@{acct.ig_username ?? '（未取回）'}</b>
          </p>
          <form action="/api/ig/sync" method="post">
            <input type="hidden" name="merchant" value={merchant} />
            <button className="px-3 py-1 border rounded">同步最新媒體</button>
          </form>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">媒體清單（勾選發佈）</h2>
        {!medias?.length ? (
          <p className="text-gray-500">尚無資料，先點「同步最新媒體」。</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {medias.map((m) => (
              <MediaCard key={m.ig_media_id} m={m} merchant={merchant} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MediaCard({ m, merchant }: { m: IgMediaRow; merchant: string }) {
  const img =
    m.media_type === 'VIDEO' ? m.thumbnail_url || m.media_url : m.media_url

  return (
    <form
      action="/api/dashboard/toggle"
      method="post"
      className="border rounded overflow-hidden"
    >
      <input type="hidden" name="merchant" value={merchant} />
      <input type="hidden" name="ig_media_id" value={m.ig_media_id} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img} alt="" className="w-full aspect-square object-cover" />
      <div className="p-2 flex items-center justify-between text-sm">
        <span className="truncate">{m.caption ?? ''}</span>
        <button className="px-2 py-1 border rounded">切換發佈</button>
      </div>
    </form>
  )
}