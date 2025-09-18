// app/api/debug/auth/route.ts (只在本機測試，用完刪！)
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'missing service role' }, { status: 500 })
  }
  const url = new URL(req.url)
  const email = url.searchParams.get('email') || ''

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  const found = data?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

  return NextResponse.json({
    project: process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasUser: !!found,
    emailConfirmed: found?.email_confirmed_at ? true : false,
    error: error?.message ?? null
  })
}