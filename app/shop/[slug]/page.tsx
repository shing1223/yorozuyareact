import Link from "next/link"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

async function sb() {
  const jar = await cookies() // Next 15：這是 Promise

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 回傳目前所有 cookies，交給 supabase-ssr 解析
        getAll() {
          return jar.getAll()
        },
        // 讓 supabase-ssr 設回（或覆蓋）cookies
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options })
          })
        },
      },
    }
  )
}

export const dynamic = "force-dynamic"

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const supabase = await sb()
  const slug = params.slug

  const { data, error } = await supabase
    .from("v_public_feed")
    .select("ig_media_id, media_type, media_url, thumbnail_url, caption, permalink, timestamp")
    .eq("merchant_slug", slug)
    .order("timestamp", { ascending: false })
    .limit(60)

  // （可選）偵錯：若匿名權限/RLS 出錯，這裡能快速看見
  // if (error) console.error('/shop page query error', error)

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">@{slug} 精選貼文</h1>

      {!data?.length ? (
        <p className="text-gray-500">尚無公開貼文。</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.map((m) => {
            const img = m.media_type === "VIDEO" ? (m.thumbnail_url ?? m.media_url) : m.media_url
            return (
              <Link
                key={m.ig_media_id}
                href={`/shop/${slug}/media/${m.ig_media_id}`} // ✅ 指向 /media/[id]
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