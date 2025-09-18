// app/api/auth/set/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = (await req.json().catch(() => ({}))) as {
    access_token?: string
    refresh_token?: string
  }
  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'missing_tokens' }, { status: 400 })
  }

  const res = NextResponse.json({ ok: true })
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options?: CookieOptions) => {
          res.cookies.set(name, value, options)
        },
        remove: (name: string, options?: CookieOptions) => {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) {
    return NextResponse.json({ error: 'set_session_failed', detail: error.message }, { status: 400 })
  }

  return res
}

export const dynamic = 'force-dynamic'