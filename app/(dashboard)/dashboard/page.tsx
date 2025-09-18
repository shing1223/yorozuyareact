// app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'
export const dynamic = 'force-dynamic'

export default async function DashboardHome() {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard')

  const merchant = 'shop1' // 先固定
  const { data: acct } = await supabase.from('ig_account')
    .select('ig_username, ig_user_id')
    .eq('merchant_slug', merchant)
    .maybeSingle()

  const { data: medias } = await supabase.from('ig_media')
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
          {/* Dashboard 中 */}
<form action={`/api/ig/sync?merchant=${merchant}`} method="post">
  <input type="hidden" name="merchant" value={merchant} />
  <button className="px-3 py-1 border rounded">同步最新媒體</button>
</form>
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-medium">媒體清單（勾選發佈）</h2>
        {!medias?.length ? <p className="text-gray-500">尚無資料，先點「同步最新媒體」。</p> : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {medias!.map(m => <Card key={m.ig_media_id} m={m} />)}
          </div>
        )}
      </section>
    </div>
  )
}

function Card({ m }: { m: any }) {
  const img = m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url) : m.media_url
  return (
    <div className="border rounded overflow-hidden">
      <img src={img} alt="" className="w-full aspect-square object-cover"/>
      <div className="p-2 text-sm truncate">{m.caption ?? ''}</div>
    </div>
  )
}