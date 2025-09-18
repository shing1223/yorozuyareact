import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

async function getSupabaseServer() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export default async function DashboardHome() {
  // ❗若你有 middleware 驗證 session，這裡就不再查 session，以免重複
  const sb = await getSupabaseServer()
  const merchant = 'shop1' // 先固定；之後從登入者/選單決定

  const { data: acct } = await sb.from('ig_account')
    .select('ig_username, ig_user_id')
    .eq('merchant_slug', merchant)
    .maybeSingle()

  const { data: medias } = await sb.from('ig_media')
    .select('ig_media_id, media_type, media_url, thumbnail_url, caption, timestamp')
    .eq('merchant_slug', merchant)
    .order('timestamp', { ascending: false })
    .limit(60)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">後台總覽</h1>

      {!acct ? (
        <div className="space-y-3">
          <p>尚未連結 Instagram。</p>
          <a href={`/api/ig/auth?merchant=${merchant}`} className="inline-flex items-center px-4 py-2 rounded bg-black text-white">
            連結 Instagram
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <p>已連結 IG：<b>@{acct.ig_username}</b></p>
          <form action="/api/ig/sync" method="post">
            <button className="px-3 py-1 border rounded">同步最新媒體</button>
          </form>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">媒體清單（勾選發佈）</h2>
        {!medias?.length ? <p className="text-gray-500">尚無資料，先點「同步最新媒體」。</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {medias!.map(m => (
              <MediaCard key={m.ig_media_id} m={m} merchant={merchant} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MediaCard({ m, merchant }:{ m:any, merchant:string }) {
  const img = m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url) : m.media_url
  return (
    <form
      action="/api/dashboard/toggle"
      method="post"
      className="border rounded overflow-hidden"
    >
      <input type="hidden" name="merchant" value={merchant}/>
      <input type="hidden" name="ig_media_id" value={m.ig_media_id}/>
      <img src={img} alt="" className="w-full aspect-square object-cover"/>
      <div className="p-2 flex items-center justify-between text-sm">
        <span className="truncate">{m.caption ?? ''}</span>
        <button className="px-2 py-1 border rounded">切換發佈</button>
      </div>
    </form>
  )
}