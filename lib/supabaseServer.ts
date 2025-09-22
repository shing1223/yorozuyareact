// lib/supabaseServer.ts
import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

/**
 * 取得「伺服器端」Supabase client（支援 RSC / Server Actions）
 * - 會自動把 Supabase 的 Set-Cookie 寫回 Next.js cookies()
 */
export async function getSb() {
  const jar = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // 供 Supabase 讀 cookie
        getAll() {
          return jar.getAll()
        },
        // 供 Supabase 寫回 cookie（登入/刷新 token 用）
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...(options as CookieOptions) })
          })
        },
      },
    }
  )
}