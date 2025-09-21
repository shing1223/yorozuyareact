// app/(public)/shop/[slug]/page.tsx
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { ChevronLeft, Play } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ShopPage({ params }: { params: { slug: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from("v_public_feed")
    .select("ig_media_id, media_type, media_url, thumbnail_url, caption, permalink, timestamp")
    .eq("merchant_slug", params.slug)
    .order("timestamp", { ascending: false })
    .limit(60)

  if (error) {
    return (
      <main className="mx-auto max-w-[720px] p-6">
        讀取失敗：{error.message}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[720px]">
      {/* 置頂返回列（與首頁風格一致） */}
      <header
        className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 border-b"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 px-2 py-3">
          <Link
            href="/"
            aria-label="返回首頁"
            className="p-2 rounded-lg hover:bg-gray-100 active:scale-95"
          >
            <ChevronLeft size={22} />
          </Link>
          <h1 className="text-base font-semibold leading-none">@{params.slug} 精選貼文</h1>
        </div>
      </header>

      {/* 內容 */}
      <section className="px-4 py-4 pb-24">
        {!data?.length ? (
          <p className="text-gray-500">尚無公開貼文。</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.map((m) => {
              const img = m.media_type === "VIDEO" ? (m.thumbnail_url ?? m.media_url) : m.media_url
              return (
                <Link
                  key={m.ig_media_id}
                  href={`/shop/${params.slug}/media/${m.ig_media_id}`}
                  className="group block overflow-hidden rounded-2xl border bg-white shadow-sm active:scale-[0.98]"
                >
                  <div className="relative">
                    <img
                      src={img!}
                      alt=""
                      className="h-auto w-full aspect-square object-cover"
                      loading="lazy"
                    />
                    {m.media_type === "VIDEO" && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
                        <Play size={12} />
                        影片
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm text-gray-800">{m.caption}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}