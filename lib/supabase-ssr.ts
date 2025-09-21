// lib/supabase-ssr.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getServerSupabase() {
  // 在 Next 15 這可能是 Promise；用 await 安全取得 cookie jar
  const jar = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 交給 Supabase 的「讀取所有 cookies」
        getAll() {
          return jar.getAll()
        },
        // 交給 Supabase 的「批次寫入 cookies」
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options })
          })
        },
      },
    }
  )
}