// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options?: CookieOptions) => {
          res.cookies.set(name, value, options)
        },
        remove: (name: string, options?: CookieOptions) => {
          res.cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname, searchParams } = req.nextUrl
  const publicExact = new Set(['/', '/login', '/auth/callback'])
  const publicPrefixes = ['/api/', '/_next', '/favicon', '/assets', '/images', '/fonts']
  const isPublic = publicExact.has(pathname) || publicPrefixes.some(p => pathname.startsWith(p))
  if (isPublic) return res

  if (pathname.startsWith('/dashboard') && !session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname + (searchParams.toString() ? `?${searchParams}` : ''))
    return NextResponse.redirect(url)
  }

  return res
}

export const config = { matcher: ['/:path*'] }