// lib/supabase-server.ts
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function createSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        // RSC 端不寫 cookie（避免 Next 警告）
        set(_n: string, _v: string, _o?: CookieOptions) {},
        remove(_n: string, _o?: CookieOptions) {},
      },
    }
  )
}