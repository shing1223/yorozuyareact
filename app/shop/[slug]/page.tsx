// app/(public)/shop/[slug]/page.tsx（或你的檔案路徑）
import Link from "next/link";
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

async function sb() {
  const jar = await cookies() // ✅ 要 await
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(n: string) {
          return jar.get(n)?.value
        },
        set(n: string, v: string, o: CookieOptions) {
          jar.set({ name: n, value: v, ...o })
        },
        remove(n: string, o: CookieOptions) {
          jar.set({ name: n, value: '', ...o, maxAge: 0 })
        },
      },
    }
  )
}

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const supabase = await sb() // ✅ 也要 await
  const slug = params.slug

  const { data } = await supabase
    .from('v_public_feed')
    .select('ig_media_id, media_type, media_url, thumbnail_url, caption, permalink, timestamp')
    .eq('merchant_slug', slug)
    .order('timestamp', { ascending: false })
    .limit(60)

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">@{slug} 精選貼文</h1>

      {!data?.length ? (
        <p className="text-gray-500">尚無公開貼文。</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
         {data.map((m) => {
  const img = m.media_type === 'VIDEO' ? (m.thumbnail_url ?? m.media_url) : m.media_url
  return (
    <Link
      key={m.ig_media_id}
      href={`/shop/${slug}/${m.ig_media_id}`}
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