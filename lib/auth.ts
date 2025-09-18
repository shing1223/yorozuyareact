// lib/auth.ts
import { createSupabaseServer } from './supabase-server'

export async function getSessionAndUser() {
  const supabase = await createSupabaseServer() // ← 要 await
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error) throw error
  return { session, user: session?.user ?? null }
}

export async function getMyMerchants() {
  const supabase = await createSupabaseServer() // ← 要 await
  const { data, error } = await supabase
    .from('membership')
    .select(`
      role,
      merchant:merchant_id (
        id,
        name,
        slug
      )
    `)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}