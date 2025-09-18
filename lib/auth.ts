// lib/auth.ts
import { createSupabaseServer } from './supabaseServer'

export async function getSessionAndUser() {
  const supabase = createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  return { session, user }
}

export async function getMyMerchants() {
  const supabase = createSupabaseServer()
  const { data, error } = await supabase
    .from('membership')
    .select('merchant:merchant_id(id, name, slug), role')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}