// app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function DashboardHome() {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard')

  const merchant = 'shop1' // 先固定

  const { data: acct } = await supabase
    .from('ig_account')
    .select('ig_username, ig_user_id')
    .eq('merchant_slug', merchant)
    .maybeSingle()

  const { data: medias } = await supabase
    .from('ig_media')
    .select('ig_media_id, media_type, media_url, thumbnail_url, caption, timestamp')
    .eq('merchant_slug', merchant)
    .order('timestamp', { ascending: false })
    .limit(60)

  // 讀取當前勾選（已發佈）清單
  const { data: sel } = await supabase
    .from('media_selection')
    .select('ig_media_id, is_published')
    .eq('merchant_slug', merchant)

  const publishedMap = new Map<string, boolean>(
    (sel ?? []).map(s => [s.ig_media_id as string, !!s.is_published])
  )

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
          <p>已連結 IG：<b>@{acct.ig_username}</b></p>

          <form action={`/api/ig/sync?merchant=${merchant}`} method="post">
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
            {medias.map(m => (
              <MediaCard
                key={m.ig_media_id}
                m={m}
                merchant={merchant}
                published={publishedMap.get(m.ig_media_id) ?? false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MediaCard({
  m,
  merchant,
  published,
}: {
  m: any
  merchant: string
  published: boolean
}) {
  const img = m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url) : m.media_url

  return (
    <form action="/api/dashboard/toggle" method="post" className="border rounded overflow-hidden">
      <input type="hidden" name="merchant" value={merchant} />
      <input type="hidden" name="ig_media_id" value={m.ig_media_id} />

      <div className="relative">
        {!!published && (
          <span className="absolute top-2 left-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
            已發佈
          </span>
        )}
        <img src={img} alt="" className="w-full aspect-square object-cover" />
      </div>

      <div className="p-2 text-sm space-y-2">
        <div className="line-clamp-2">{m.caption ?? ''}</div>

        {/* 若想改成直接點勾就送出，需寫 client component；這裡用按鈕切換最穩 */}
        <button className="w-full px-2 py-1 border rounded">
          {published ? '取消發佈' : '設定為發佈'}
        </button>
      </div>
    </form>
  )
}