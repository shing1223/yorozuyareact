// app/page.tsx（或你放的同一路徑）
// 用 Supabase SSR client（匿名可查公開資料）
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const revalidate = 60

async function getServerSupabase() {
  const jar = await cookies(); // ✅ Next 15: cookies() 回傳 Promise

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
  const supabase = await getServerSupabase(); // ✅ 記得 await

  // 依你的實際表名/欄位調整
  const { data: merchants, error } = await supabase
    .from('merchants')
    .select('id, name, slug')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('讀取商戶列表失敗:', error.message)
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex gap-3">
        <Link href="/login" className="px-3 py-1 border rounded">登入</Link>
        <Link href="/dashboard" className="px-3 py-1 border rounded">後台</Link>
      </div>

      <h1 className="text-3xl font-bold">Instagram 精選平台</h1>
      <p className="text-gray-600">到以下商戶頁面，查看各自公開的 IG 精選貼文牆：</p>

      {merchants?.length ? (
        <ul className="list-disc pl-6 space-y-2">
          {merchants.map((m) => (
            <li key={m.id}>
              <Link className="text-blue-600 underline" href={`/${m.slug}`}>
                {m.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">目前沒有商戶。</p>
      )}
    </main>
  )
}