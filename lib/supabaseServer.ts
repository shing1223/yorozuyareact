// lib/supabaseServer.ts
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types'

export function createSupabaseServer() {
  return createServerComponentClient<Database>({ cookies })
}