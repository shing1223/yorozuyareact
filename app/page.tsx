// app/page.tsx
import Link from "next/link"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import CollapsibleHeader from "@/components/CollapsibleHeader"

export const dynamic = "force-dynamic"

async function getServerSupabase() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options })
          })
        },
      },
    }
  )
}

export default async function Home() {
  const supabase = await getServerSupabase()

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("slug, name")
    .eq("is_public", true)
    .order("created_at", { ascending: true })

  if (error) console.error("merchants query error:", error)

  return (
    <main className="mx-auto max-w-[720px]">
      {/* Top bar */}
      <CollapsibleHeader
  brand="萬事屋"
  handle="@yorozuya"
  // features、tabs 不傳就用預設，也可自行覆蓋：
  // features={[
  //   { label: "首頁", bg: "bg-red-500" },
  //   { label: "初創", bg: "bg-pink-500" },
  //   ...
  // ]}
  // tabs={["首頁", "熱門", "最新"]}
/>

      {/* Banner 區塊 */}
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-2xl border bg-[#f6a400]">
          <div className="aspect-[3/4] sm:aspect-[16/9] grid place-items-center p-6">
            <div className="text-center">
              <div className="mx-auto mb-3 inline-block rounded-full border-2 border-red-700 px-4 py-2 text-lg font-extrabold text-red-800">
                本週推薦
              </div>
              <h3 className="text-white text-xl font-black tracking-wide"><br/>BAPRE Store</h3>
              <p className="mt-3 max-w-xs text-white/90 text-sm">
                Spread Mid-Autumn good wishes. Save thousands of mooncakes from going to landfill.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 文章標題/說明 */}
      <section className="px-4 py-5">
        <h2 className="text-[22px] font-bold leading-snug">「樂餸中秋」月餅捐贈行動 2025</h2>
        <p className="mt-2 text-gray-600 text-sm">秉憐將於 2025 年 9 月 15 至 26 日推行「樂餸中秋 2025」……</p>
      </section>

      {/* 商戶卡片 */}
      {!!merchants?.length && (
        <section className="px-4 pb-6">
          <h3 className="mb-3 text-base font-semibold">商戶專區</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {merchants.map((m) => (
              <Link
                key={m.slug}
                href={`/shop/${m.slug}`}
                className="group rounded-2xl border bg-white p-4 shadow-sm active:scale-[0.98]"
              >
                <div className="h-20 w-full rounded-xl bg-gray-100 grid place-items-center text-gray-400 text-xs">
                  封面
                </div>
                <div className="mt-2 line-clamp-1 font-medium group-hover:underline">{m.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 登入 / 後台捷徑 
      <section className="px-4 pb-24">
        <div className="flex gap-3">
          <Link href="/login" className="px-3 py-2 border rounded-xl active:scale-95">登入</Link>
          <Link href="/dashboard" className="px-3 py-2 border rounded-xl active:scale-95">後台</Link>
        </div>
      </section>*/}


    </main>
  )
}