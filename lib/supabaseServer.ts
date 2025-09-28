// lib/supabaseServer.ts
import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

/**
 * 伺服器端 Supabase Client（RSC / Server Actions / Route Handlers）
 * - 使用「相容介面」cookies: { get / set / remove }
 * - Next 15 下 cookies() 為 async，因此這裡使用 await
 */
export async function getSb() {
  const jar = await cookies() // Next 15 types: Promise<ReadonlyRequestCookies>

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // 千萬別放 service_role
    {
      cookies: {
        get(name: string) {
          return jar.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // 在 RSC 場景有時不可寫，包 try 以避免 throw
          try {
            jar.set({ name, value, ...options })
          } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            jar.delete({ name, ...options })
          } catch {}
        },
      },
    }
  )
}