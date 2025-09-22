// app/(public)/shop/[slug]/page.tsx
import Link from "next/link"
import DetailAppHeader from "@/components/DetailAppHeader"
import { createClient } from "@supabase/supabase-js"
import { Play } from "lucide-react"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"

type FromKey = "startup" | "service" | "shop" | undefined

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: FromKey }>
}) {
  // ✅ await 新版 async params / searchParams
  const { slug } = await params
  const { from } = await searchParams

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from("v_public_feed")
    .select(
      "ig_media_id, media_type, media_url, thumbnail_url, caption, permalink, timestamp"
    )
    .eq("merchant_slug", slug)
    .order("timestamp", { ascending: false })
    .limit(60)

  // ✅ await 新版 async headers()
  const headerList = await headers()
  const referer = headerList.get("referer") || ""

  // 來源判斷
  let backHref = "/shop/categories"
  let activeFeature: "首頁" | "初創" | "服務" | "網店" | "其他" = "網店"

  if (from === "startup" || referer.includes("/startup")) {
    backHref = "/startup"
    activeFeature = "初創"
  } else if (from === "service" || referer.includes("/service")) {
    backHref = "/service"
    activeFeature = "服務"
  } else if (from === "shop" || referer.includes("/shop/categories")) {
    backHref = "/shop/categories"
    activeFeature = "網店"
  }

  if (error) {
    return (
      <main className="mx-auto max-w-[1080px] p-6">
        讀取失敗：{error.message}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <DetailAppHeader
        brand={`@${slug} 精選`}   // 顯示在第一行
        handle=""                 // 不顯示副標
        activeFeature={activeFeature}
        backHref={backHref}
        showFeatureRow={false}
      />

      {/* 內容 */}
      <section className="px-4 py-4 pb-24">
        {!data?.length ? (
          <p className="text-gray-500">尚無公開貼文。</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.map((m) => {
              const img =
                m.media_type === "VIDEO" ? (m.thumbnail_url ?? m.media_url) : m.media_url
              const nextFrom =
                from ??
                (activeFeature === "初創"
                  ? "startup"
                  : activeFeature === "服務"
                  ? "service"
                  : "shop")
              return (
                <Link
                  key={m.ig_media_id}
                  href={`/shop/${slug}/media/${m.ig_media_id}?from=${nextFrom}`}
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