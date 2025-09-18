// lib/env.ts
export const env = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

export function assertPublicEnv() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
}