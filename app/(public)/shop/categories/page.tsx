// app/(public)/shop/categories/page.tsx
import Link from "next/link"
import CollapsibleHeader from "@/components/CollapsibleHeader"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"

async function getSb() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options })
          })
        },
      },
    }
  )
}

type CatKey = "startup" | "shop" | "service" | "other"

const CAT_META: Record<CatKey, { name: string; bg: string; emoji: string }> = {
  startup: { name: "初創",  bg: "from-pink-500 to-fuchsia-600", emoji: "🚀" },
  shop:    { name: "商店",  bg: "from-amber-400 to-red-500",    emoji: "🛍️" },
  service: { name: "服務",  bg: "from-sky-400 to-indigo-500",   emoji: "🧰" },
  other:   { name: "其他",  bg: "from-emerald-400 to-teal-500",  emoji: "✨" },
}

export default async function CategoriesPage() {
  const supabase = await getSb()

  // 取各分類的公開商戶數量
  const { data: counts, error } = await supabase
    .from("merchants")
    .select("category, count:count()", { head: false })
    .eq("is_public", true)
    .returns<{ category: CatKey | null; count: number }[]>()

  if (error) console.error("categories count error:", error)

  const countMap = (counts ?? []).reduce<Record<CatKey, number>>((acc, row) => {
    const key = (row.category ?? "other") as CatKey
    acc[key] = (acc[key] ?? 0) + Number(row.count || 0)
    return acc
  }, { startup: 0, shop: 0, service: 0, other: 0 })

  const keys: CatKey[] = ["startup", "shop", "service", "other"]

  return (
    <main className="mx-auto max-w-[720px]">
      <CollapsibleHeader brand="萬事屋" handle="@yorozuya" activeFeature="網店" />

      <section className="px-4 py-4 pb-24">
        <h2 className="mb-3 text-xl font-bold">網店・分類</h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {keys.map((k) => {
            const meta = CAT_META[k]
            return (
              <Link
                key={k}
                href={`/shop/categories/${k}`}
                className="group overflow-hidden rounded-2xl border bg-white shadow-sm active:scale-[0.98]"
              >
                <div className={`bg-gradient-to-br ${meta.bg}`}>
                  <div className="grid aspect-[5/3] place-items-center">
                    <span className="text-4xl sm:text-5xl drop-shadow">{meta.emoji}</span>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="line-clamp-1 font-semibold group-hover:underline">
                      {meta.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {countMap[k] ?? 0}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    公開商戶數
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}