// app/(public)/shop/[slug]/page.tsx
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('v_public_feed')
    .select('ig_media_id, media_type, media_url, thumbnail_url, caption, permalink, timestamp')
    .eq('merchant_slug', params.slug)
    .order('timestamp', { ascending: false })
    .limit(60)

  if (error) {
    return <main className="max-w-6xl mx-auto p-6">讀取失敗：{error.message}</main>
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">@{params.slug} 精選貼文</h1>

      {!data?.length ? (
        <p className="text-gray-500">尚無公開貼文。</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.map(m => {
            const img = m.media_type === 'VIDEO' ? (m.thumbnail_url ?? m.media_url) : m.media_url
            return (
              <Link
                key={m.ig_media_id}
                href={`/shop/${params.slug}/media/${m.ig_media_id}`}
                className="block border rounded overflow-hidden hover:shadow-sm transition"
              >
                <img src={img!} alt="" className="w-full aspect-square object-cover" />
                <div className="p-2 text-sm line-clamp-2">{m.caption}</div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}