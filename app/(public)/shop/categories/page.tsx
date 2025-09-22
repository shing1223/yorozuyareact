// app/(public)/shop/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import { getSb } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const supabase = await getSb()

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("slug, name, avatar_url")
    .eq("is_public", true)
    .eq("category", "shop")
    .order("created_at", { ascending: true })
    .order("name", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("shop merchants error:", error)
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="網店" />

      <section className="px-4 py-6 pb-24">
        <h2 className="mb-3 text-xl font-bold">網店專區</h2>

        {!merchants?.length ? (
          <p className="text-gray-500">目前沒有公開的網店商戶。</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {merchants.map((m) => (
              <Link
                key={m.slug}
                href={`/shop/${m.slug}?from=shop`}
                className="group overflow-hidden rounded-2xl border bg-white p-3 shadow-sm active:scale-[0.98]"
              >
                 <div className="h-20 w-full flex items-center justify-center bg-gray-100 rounded-xl">
  {m.avatar_url ? (
    <img
      src={m.avatar_url}
      alt={`${m.name} avatar`}
      className="h-16 w-16 rounded-full object-cover"
    />
  ) : (
    <span className="text-gray-400 text-xs">封面</span>
  )}
</div>
                <div className="mt-2 line-clamp-1 font-semibold group-hover:underline">
                  {m.name}
                </div>
                <div className="mt-1 text-xs text-gray-500">@{m.slug}</div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}