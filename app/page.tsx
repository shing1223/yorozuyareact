// app/page.tsx
import Link from "next/link"
import CollapsibleHeader from "@/components/CollapsibleHeader"
import { getSb } from "@/lib/supabaseServer"
import DragScroll from "@/components/DragScroll"

export const dynamic = "force-dynamic"

type MerchantRow = {
  slug: string
  tags: string[]
  name: string
  avatar_url: string | null
}

export default async function Home() {
  const supabase = await getSb()

  // 只取最新 12 位公開商戶（依建立時間倒序）
  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("slug, tags, name, avatar_url, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<MerchantRow[]>()

  if (error) console.error("merchants query error:", error)

  return (
    <main className="mx-auto max-w-[1080px]">
      <CollapsibleHeader
  brand="萬事屋"
  handle="@yorozuya"
  activeFeature="首頁"
  activeTab="最新"
  tabs={["最新", "熱門"]}
/>

{/* 滾動橫幅 BANNER（可拖曳 + 觸控） */}
<section className="px-4 pt-4">
  <DragScroll className="snap-x snap-mandatory pb-1">
    {[
      {
        title: "助你一臂之力",
        name: "",
        desc: "",
        bg: "bg-[#f6a400]",
        img: "/images/banner1.png",
        href: "#",
      },
      {
        title: "投資人",
        name: "加入成為投資者",
        desc: "了解創作家的構想，與他們共同成長。",
        bg: "bg-pink-500",
        img: "/images/banner1.png",
        href: "/shop/mysecondshop",
      },
      {
        title: "最新加入",
        name: "Demo Shop",
        desc: "Just launched – check out our exciting products!",
        bg: "bg-blue-500",
        img: "/images/banner1.png",
        href: "/shop/demo",
      },
    ].map((b, i) => (
      <Link
        key={i}
        href={b.href}
        className={`relative shrink-0 w-[85%] sm:w-[70%] snap-start overflow-hidden rounded-2xl border ${b.bg}`}
      >
        {/* 背景圖 */}
        <img
  src={b.img}
  alt={b.name}
  className="absolute inset-0 h-full w-full object-contain"
  loading="lazy"
  draggable={false}
/>

        {/* 半透明遮罩，讓文字更清楚 */}
        <div className="absolute inset-0 bg-white/25" />

        {/* 內容層 */}
        <div className="relative grid place-items-center p-6 aspect-[16/9]">
          <div className="text-center">
      
            <h3 className="text-white text-xl font-black tracking-wide">{b.name}</h3>
            <p className="mt-3 max-w-xs text-white/90 text-sm">{b.desc}</p>
          </div>
        </div>
      </Link>
    ))}
  </DragScroll>
</section>

      {/* 文章標題/說明 */}
      <section className="px-4 py-5">
        <h2 className="text-[22px] font-bold leading-snug">「萬事起頭難」⋯</h2>
        <p className="mt-2 text-gray-600 text-sm">困難而卻步? 「萬事屋」助你起步!</p>
      </section>

      {/* 最新商戶（12 位） */}
      {!!merchants?.length && (
        <section className="px-4 py-4 pb-24">
          <h3 className="mb-3 text-base font-semibold">最新商戶</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {merchants.map((m) => (
              <Link
                key={m.slug}
                href={`/shop/${m.slug}`}
                className="group overflow-hidden rounded-2xl border bg-white p-4 shadow-sm active:scale-[0.98]"
              >
                {/* 頭像：80px 圓形，object-contain 不裁切 */}
                <div className="h-20 w-full flex items-center justify-center rounded-xl bg-gray-100">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={`${m.name} avatar`}
                      className="h-20 w-20 rounded-full object-contain bg-white"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">封面</span>
                  )}
                </div>

                <div className="mt-2 line-clamp-1 font-medium group-hover:underline">
                  {m.name}
                </div>
               <div className="mt-1 line-clamp-1 text-xs text-gray-500">{m.tags}</div>
                <div className="mt-1 text-xs text-gray-500">@{m.slug}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}