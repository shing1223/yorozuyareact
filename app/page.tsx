import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

async function sb() {
  const jar = await cookies() // ✅ 取得 cookie jar
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return jar.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          jar.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          jar.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}

export default async function Home() {
  const supabase = await sb() // ✅ 記得 await

  // 先固定 merchant = 'shop1'
  const { data: acct } = await supabase
    .from('ig_account')
    .select('ig_username')
    .eq('merchant_slug', 'shop1')
    .maybeSingle()

  const uname = acct?.ig_username ?? '（尚未連結）'

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-4xl font-bold">Instagram 精選平台</h1>

      <p className="text-lg">
        已連結 IG：<span className="font-semibold">@{uname}</span>
      </p>

      <ul className="list-disc pl-6">
        <li>
          <Link href="/shop/shop1" className="text-blue-600 underline">
            前往商戶頁
          </Link>
        </li>
      </ul>
    </main>
  )
}