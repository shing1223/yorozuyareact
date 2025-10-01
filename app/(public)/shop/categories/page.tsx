// app/(public)/shop/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import { getSb } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const supabase = await getSb()

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("slug, name, tags, avatar_url")
    .eq("is_public", true)
    .eq("category", "shop")
    .order("created_at", { ascending: true })
    .order("name", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("shop merchants error:", error)
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="網店" />

      <section className="px-4 py-6 pb-24">
        <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">
          網店專區
        </h2>

        {!merchants?.length ? (
          <p className="text-gray-500 dark:text-gray-400">
            目前沒有公開的網店商戶。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {merchants.map((m) => (
              <Link
                key={m.slug}
                href={`/shop/${m.slug}?from=shop`}
                className="group overflow-hidden rounded-2xl border bg-white p-3 shadow-sm active:scale-[0.98]
                           border-gray-200 dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none"
              >
                <div className="h-40 w-full flex items-center justify-center bg-gray-100 dark:bg-neutral-800 rounded-xl">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={`${m.name} avatar`}
                      className="h-20 w-20 rounded-full object-contain bg-white dark:bg-neutral-900"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">封面</span>
                  )}
                </div>
                <div className="mt-2 line-clamp-1 font-semibold group-hover:underline text-gray-900 dark:text-gray-100">
                  {m.name}
                </div>
                <div className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                  {m.tags}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  @{m.slug}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}