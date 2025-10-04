// app/(public)/shop/[slug]/media/[id]/page.tsx
import Link from "next/link"
import DetailAppHeader from "@/components/DetailAppHeader"
import AddToCartButton from "@/components/AddToCartButton"
import type { CartItemInput } from "@/types/cart"
import { getSb } from "@/lib/supabaseServer"
import { headers } from "next/headers"
import IgImage from "@/components/IgImage"   // ✅ 新增

export const dynamic = "force-dynamic"

type FromKey = "startup" | "service" | "shop" | undefined
const symbol = (cur?: string) => (cur === "HKD" ? "HK$" : cur === "TWD" ? "NT$" : cur ?? "")

// 代理工具
function proxied(u?: string | null) {
  if (!u) return ""
  return `/api/ig-img?u=${encodeURIComponent(u)}`
}

// 最終占位圖
const FALLBACK_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'>
       <rect width='100%' height='100%' fill='#eee'/>
       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
             font-family='system-ui, sans-serif' font-size='14' fill='#888'>
         image unavailable
       </text>
     </svg>`
  )

export default async function MediaDetail({ params, searchParams }: {
  params: Promise<{ slug: string; id: string }>
  searchParams: Promise<{ from?: FromKey }>
}) {
  const { slug, id } = await params
  const { from } = await searchParams

  const supabase = await getSb()

  // ① 取公開貼文
  const { data: item, error } = await supabase
    .from("v_public_feed")
    .select("merchant_slug, ig_media_id, media_type, media_url, thumbnail_url, caption, permalink, timestamp")
    .eq("merchant_slug", slug)
    .eq("ig_media_id", id)
    .maybeSingle()

  if (error || !item) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <p className="text-gray-500 dark:text-gray-400">找不到這則貼文。</p>
        <Link className="text-blue-600 underline dark:text-blue-400" href={`/shop/${slug}`}>
          ← 返回商戶
        </Link>
      </main>
    )
  }

  // ② 定價
  const { data: bind } = await supabase
    .from("media_product")
    .select("product:product_id(id, title, price, currency)")
    .eq("merchant_slug", slug)
    .eq("ig_media_id", id)
    .maybeSingle()

  const product = Array.isArray(bind?.product) ? bind?.product[0] : bind?.product || null
  const price = product?.price ?? null
  const currency = (product?.currency as string | null) ?? "TWD"
  const productTitle = (product?.title as string | null) ?? null

  const rawImg = item.media_type === "VIDEO" ? item.thumbnail_url ?? item.media_url : item.media_url

  const title =
    (item.caption || "")
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean)[0] || productTitle || `@${item.merchant_slug} 的精選貼文`

  // 來源/返回
  const headerList = await headers()
  const referer = headerList.get("referer") || ""
  let activeFeature: "首頁" | "初創" | "服務" | "網店" | "其他" = "首頁"
  let fromKey: "startup" | "service" | "shop" | "" = ""

  if (from === "startup" || referer.includes("/startup")) { activeFeature = "初創"; fromKey = "startup" }
  else if (from === "service" || referer.includes("/service")) { activeFeature = "服務"; fromKey = "service" }
  else if (from === "shop" || referer.includes("/shop")) { activeFeature = "網店"; fromKey = "shop" }

  const backHref = `/shop/${slug}?from=${from ?? fromKey}`

  const cartItem: CartItemInput = {
    merchant_slug: item.merchant_slug,
    ig_media_id: item.ig_media_id,
    title,
    image: rawImg!,            // 存原始；渲染時再 proxy
    permalink: item.permalink,
    caption: item.caption || "",
    price: price ?? undefined,
    currency: currency ?? undefined,
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <DetailAppHeader
        brand={`@${slug} 貼文詳情`}
        handle=""
        activeFeature={activeFeature}
        backHref={backHref}
        showFeatureRow={false}
      />

      <section className="px-4 py-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 圖片卡片（用 Client 的 IgImage） */}
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm
                          border-gray-200 dark:border-neutral-800 dark:bg-neutral-900">
            <IgImage
              src={proxied(rawImg)}
              thumb={item.thumbnail_url ? proxied(item.thumbnail_url) : undefined}
              alt={title}
              className="w-full object-cover"
              fallback={FALLBACK_DATA_URL}
            />
          </div>

          {/* 內容 */}
          <div className="space-y-5">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h1>

            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">
              {item.caption || "—"}
            </div>

            <div className="pt-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {price != null ? `${symbol(currency)} ${Number(price).toLocaleString()}` : "—"}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <AddToCartButton item={{ ...cartItem, price: price ?? 0, currency }} />
              <a
                href={item.permalink!}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-3 rounded-lg border
                           border-gray-300 hover:bg-gray-50 active:scale-[0.99]
                           dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                於 Instagram 開啟
              </a>
            </div>

            <div className="pt-4">
              <Link href={backHref} className="text-blue-600 underline dark:text-blue-400">
                ← 返回 @{item.merchant_slug} 貼文列表
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}