// lib/supabase-ssr.ts
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function getServerSupabase() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll() },
        setAll(toSet) { toSet.forEach(({ name, value, options }) => jar.set({ name, value, ...options })) },
      },
    }
  )
}