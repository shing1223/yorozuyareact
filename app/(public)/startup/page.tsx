// app/(public)/startup/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import { getSb } from "@/lib/supabaseServer"
import { User } from "lucide-react"

export const dynamic = "force-dynamic"

type MerchantRow = {
  slug: string
  name: string
  ig_account: { profile_picture_url: string | null }[] | null
}

export default async function StartupPage() {
  const supabase = await getSb()

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select(`
      slug,
      name,
      ig_account (
        profile_picture_url
      )
    `)
    .eq("is_public", true)
    .eq("category", "startup")
    .order("created_at", { ascending: true })
    .order("name", { ascending: true, nullsFirst: false })
    .returns<MerchantRow[]>()              // ✅ 告訴 TS 回傳型別

  if (error) console.error("startup merchants error:", error)

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="初創" />

      <section className="px-4 py-6 pb-24">
        <h2 className="mb-3 text-xl font-bold">初創專區</h2>

        {!merchants?.length ? (
          <p className="text-gray-500">目前沒有公開初創的商戶。</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {merchants.map((m) => {
              const avatar =
                Array.isArray(m.ig_account) ? m.ig_account[0]?.profile_picture_url ?? null : null
              return (
                <Link
                  key={m.slug}
                  href={`/shop/${m.slug}?from=startup`}
                  className="group overflow-hidden rounded-2xl border bg-white p-3 shadow-sm active:scale-[0.98]"
                >
                  <div className="h-20 w-full rounded-xl bg-gray-100 grid place-items-center overflow-hidden">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={`${m.name} icon`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <User size={24} className="text-gray-400" />
                    )}
                  </div>
                  <div className="mt-2 line-clamp-1 font-semibold group-hover:underline">
                    {m.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">@{m.slug}</div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}