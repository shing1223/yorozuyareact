// app/page.tsx
import Link from "next/link"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"   // ← 先不用 ISR，避免快取吃到舊資料
// export const revalidate = 0            // 也可以這樣禁用 ISR

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

  // （可暫時保留）看得到錯誤比較好排查
  if (error) console.error("merchants query error:", error)

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex gap-3">
        <Link href="/login" className="px-3 py-1 border rounded">登入</Link>
        <Link href="/dashboard" className="px-3 py-1 border rounded">後台</Link>
      </div>

      <h1 className="text-3xl font-bold">Instagram 精選平台</h1>
      <p className="text-gray-600">到以下商戶頁面，查看各自公開的 IG 精選貼文牆：</p>

      {!merchants?.length ? (
        <p className="text-gray-500">目前沒有公開商戶。</p>
      ) : (
        <ul className="list-disc pl-6 space-y-2">
          {merchants.map((m) => (
            <li key={m.slug}>
              <Link className="text-blue-600 underline" href={`/shop/${m.slug}`}>
                {m.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}