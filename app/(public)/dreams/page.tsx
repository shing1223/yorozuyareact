// app/dreams/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import { getSb } from "@/lib/supabaseServer"

export const dynamic = "force-dynamic"

export default async function DreamsPage() {
  const supabase = await getSb()

  const { data: dreams, error } = await supabase
    .from("v_dreams_public")
    .select("id, title, public_content, up_count, down_count, created_at, display_name")
    .order("created_at", { ascending: false })
     .limit(60)

  if (error) console.error("load dreams error:", error)

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="夢想" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">夢想清單</h2>

          <Link
            href="/dreams/create"
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm active:scale-[0.98]"
          >
            發佈夢想
          </Link>
        </div>

        {!dreams?.length ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">
            尚無夢想，成為第一個發佈的人吧！
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dreams!.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/dreams/${d.id}`}
                  className="group block overflow-hidden rounded-2xl border bg-white p-4 shadow-sm hover:border-gray-300 active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 text-base font-semibold group-hover:underline">
                      {d.title}
                    </h3>
                    <div className="shrink-0 text-xs text-gray-400">
                      {new Date(d.created_at as any).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                    {d.public_content}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
   <span>發佈者：{d.display_name ?? "匿名"}</span>
   <span>支持：{d.up_count ?? 0}</span>
   <span>反對：{d.down_count ?? 0}</span>
 </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}