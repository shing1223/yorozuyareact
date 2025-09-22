// app/(public)/shop/categories/page.tsx
import Link from "next/link"
import { ChevronLeft, Search } from "lucide-react"
import AppHeader from "@/components/AppHeader"

// 先用靜態資料；之後你可改成從資料庫抓（見下方註解）
const CATEGORIES = [
  { slug: "snacks",    name: "零食點心",    desc: "餅乾、糖果、堅果",    bg: "from-amber-400 to-red-500",   emoji: "🍪" },
  { slug: "beauty",    name: "美妝保養",    desc: "保養、彩妝、香氛",    bg: "from-pink-500 to-fuchsia-600", emoji: "💄" },
  { slug: "home",      name: "居家生活",    desc: "清潔、收納、家飾",    bg: "from-emerald-400 to-teal-500", emoji: "🏠" },
  { slug: "fashion",   name: "服飾配件",    desc: "服飾、鞋包、飾品",    bg: "from-sky-400 to-indigo-500",  emoji: "🧢" },
  { slug: "kids",      name: "親子兒童",    desc: "玩具、文具、繪本",    bg: "from-lime-400 to-emerald-500", emoji: "🧸" },
  { slug: "gourmet",   name: "生鮮美食",    desc: "茶飲、醬料、熟食",    bg: "from-orange-400 to-rose-500",  emoji: "🍱" },
  { slug: "tech",      name: "3C 周邊",     desc: "耳機、行充、配件",    bg: "from-gray-700 to-gray-900",    emoji: "🎧" },
  { slug: "handmade",  name: "手作設計",    desc: "手作、設計品牌",      bg: "from-violet-500 to-purple-700",emoji: "🧵" },
]

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
   return (
     <main className="mx-auto max-w-[720px]">
        <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="網店" />
            {/* Content */}
      <section className="px-4 py-6 pb-24">
        <div className="flex items-center gap-2 px-2 py-3">
          <Link href="/" aria-label="返回首頁" className="p-2 rounded-lg hover:bg-gray-100 active:scale-95">
            <ChevronLeft size={22} />
          </Link>
          <h1 className="text-base font-semibold leading-none">所有分類</h1>
        </div>

        {/* 搜尋列（可接到你的搜尋頁） */}
        <div className="px-4 pb-3">
          <form action="/shop/search" className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2">
            <Search size={18} className="text-gray-400" />
            <input
              name="q"
              placeholder="搜尋商品或貼文"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-gray-400"
            />
          </form>
        </div>

        {/* 快速篩選 chips（可自訂熱門分類） */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {["熱門", "最新", "特價", "高評分"].map((t, i) => (
              <Link
                key={t}
                href={`/shop/search?sort=${encodeURIComponent(t)}`}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm border ${
                  i === 0 ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700"
                }`}
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
       </section>

      {/* 分類卡片網格 */}
      <section className="px-4 py-4 pb-24">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/shop/categories/${c.slug}`}
              className="group overflow-hidden rounded-2xl border bg-white shadow-sm active:scale-[0.98]"
            >
              <div className={`bg-gradient-to-br ${c.bg}`}>
                <div className="grid aspect-[5/3] place-items-center">
                  <span className="text-4xl sm:text-5xl drop-shadow">{c.emoji}</span>
                </div>
              </div>
              <div className="p-3">
                <div className="line-clamp-1 font-semibold">{c.name}</div>
                <div className="mt-1 line-clamp-1 text-xs text-gray-500">{c.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}