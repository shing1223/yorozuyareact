// app/(public)/shop/[slug]/page.tsx
import Link from "next/link"
import DetailAppHeader from "@/components/DetailAppHeader"
import { getSb } from "@/lib/supabaseServer"
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
  // ✅ Next 15: await async params / searchParams
  const { slug } = await params
  const { from } = await searchParams

  const supabase = await getSb()

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

  // 來源判斷（決定返回連結與上方色系）
  let backHref = "/"
  let activeFeature: "首頁" | "初創" | "服務" | "網店" | "其他" = "首頁"

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
        <div className="rounded-2xl border bg-white p-6 text-red-700 shadow-sm
                        border-red-200 dark:border-red-900/40 dark:bg-neutral-900 dark:text-red-300">
          讀取失敗：{error.message}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <DetailAppHeader
        brand={`@${slug} 精選`}
        handle=""
        activeFeature={activeFeature}
        backHref={backHref}
        showFeatureRow={false}
      />

      {/* 內容 */}
      <section className="px-4 py-4 pb-24">
        {!data?.length ? (
          <p className="text-gray-500 dark:text-gray-400">尚無公開貼文。</p>
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
                  className="group block overflow-hidden rounded-2xl border bg-white shadow-sm active:scale-[0.98]
                             border-gray-200 hover:border-gray-300
                             dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
                >
                  <div className="relative">
                    <img
                      src={img!}
                      alt=""
                      className="h-auto w-full aspect-square object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                    {m.media_type === "VIDEO" && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full
                                       bg-black/70 px-2 py-1 text-[10px] font-medium text-white
                                       backdrop-blur supports-[backdrop-filter]:bg-black/60">
                        <Play size={12} />
                        影片
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-sm text-gray-800 dark:text-gray-200">
                      {m.caption}
                    </p>
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