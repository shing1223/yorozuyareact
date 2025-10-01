// app/(public)/hot/page.tsx
import Link from "next/link"
import { getSb } from "@/lib/supabaseServer"
import CollapsibleHeader from "@/components/CollapsibleHeader"

export const dynamic = "force-dynamic"

export default async function HotPage() {
  const supabase = await getSb()

  // 暫定「熱門」：最近 30 天內公開商戶，按 created_at DESC
  const since = new Date()
  since.setDate(since.getDate() - 30)

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("slug, name, avatar_url, created_at")
    .eq("is_public", true)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false })
    .limit(24)

  if (error) console.error("hot merchants query error:", error)

  return (
    <main className="mx-auto max-w-[1080px]">
      <CollapsibleHeader
        brand="萬事屋"
        handle="@maxhse_com"
        activeFeature="首頁"
        activeTab="熱門"
        tabs={["最新", "熱門"]}
      />

      <section className="px-4 py-4 pb-24">
        <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
          熱門商戶
        </h3>

        {!merchants?.length ? (
          <p className="text-gray-500 dark:text-gray-400">
            暫無熱門商戶，稍後再來逛逛～
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {merchants.map((m) => (
              <Link
                key={m.slug}
                href={`/shop/${m.slug}?from=shop`}
                className="group rounded-2xl border bg-white p-4 shadow-sm active:scale-[0.98]
                           border-gray-200 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none"
              >
                <div className="h-20 w-full rounded-xl bg-gray-100 dark:bg-neutral-800 grid place-items-center overflow-hidden">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={`${m.name} avatar`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      封面
                    </span>
                  )}
                </div>
                <div className="mt-2 line-clamp-1 font-medium group-hover:underline text-gray-900 dark:text-gray-100">
                  {m.name}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}