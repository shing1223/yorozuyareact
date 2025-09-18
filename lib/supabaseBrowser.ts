// lib/supabaseBrowser.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/types'

export function createSupabaseBrowser() {
  return createClientComponentClient<Database>()
}