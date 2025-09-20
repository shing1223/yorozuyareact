import Link from "next/link"
import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import AddToCartButton from "@/components/AddToCartButton"

export const dynamic = "force-dynamic"

async function sb() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return jar.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) { jar.set({ name, value, ...options }) },
        remove(name: string, options: CookieOptions) { jar.set({ name, value: "", ...options, maxAge: 0 }) },
      },
    }
  )
}

export default async function MediaDetail({
  params,
}: { params: { slug: string; id: string } }) {
  const supabase = await sb()

  const { data: item, error } = await supabase
    .from("v_public_feed")
    .select(
      "merchant_slug, ig_media_id, media_type, media_url, thumbnail_url, caption, permalink, timestamp"
    )
    .eq("merchant_slug", params.slug)
    .eq("ig_media_id", params.id)
    .maybeSingle()

  if (error || !item) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <p className="text-gray-500">找不到這則貼文。</p>
        <Link className="text-blue-600 underline" href={`/shop/${params.slug}`}>
          ← 返回商戶
        </Link>
      </main>
    )
  }

  const img =
    item.media_type === "VIDEO" ? item.thumbnail_url ?? item.media_url : item.media_url

  // ✅ 為 map 的參數加上型別
  const title =
    (item.caption || "")
      .split("\n")
      .map((s: string) => s.trim())
      .filter(Boolean)[0] || `@${item.merchant_slug} 的精選貼文`

  return (
    <main className="max-w-6xl mx-auto p-6">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:underline">首頁</Link>
        <span className="mx-2">/</span>
        <Link href={`/shop/${item.merchant_slug}`} className="hover:underline">
          @{item.merchant_slug}
        </Link>
        <span className="mx-2">/</span>
        <span>貼文詳情</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="border rounded-xl overflow-hidden">
          <img src={img!} alt={title} className="w-full object-cover" />
        </div>

        <div className="space-y-5">
          <h1 className="text-2xl md:text-3xl font-semibold">{title}</h1>

          <div className="text-gray-600 whitespace-pre-line leading-relaxed">
            {item.caption || "—"}
          </div>

          <div className="pt-2">
            <span className="text-2xl font-bold">NT$ —</span>
            <p className="text-sm text-gray-500 mt-1">（示意）請在後台補商品定價資料</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <AddToCartButton
              item={{
                merchant_slug: item.merchant_slug,
                ig_media_id: item.ig_media_id,
                title,
                image: img!,
                permalink: item.permalink,
                caption: item.caption || "",
              }}
            />
            <a
              href={item.permalink!}
              target="_blank"
              className="inline-flex items-center justify-center px-4 py-3 rounded-lg border"
            >
              於 Instagram 開啟
            </a>
          </div>

          <div className="pt-4">
            <Link
              href={`/shop/${item.merchant_slug}`}
              className="text-blue-600 underline"
            >
              ← 返回 @{item.merchant_slug} 貼文列表
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}