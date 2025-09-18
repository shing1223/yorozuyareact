// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // 每次請求同步 session / 刷新 token（交給 helpers 寫 cookie）
  await supabase.auth.getSession()

  const { pathname, searchParams } = req.nextUrl

  // 放行的公開路徑
  const isPublic =
    pathname === '/' ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/ig/') ||        // IG OAuth 需要
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/login'

  if (isPublic) {
    // 已登入的使用者造訪 /login → 直接導去 redirect 或 /dashboard
    if (pathname === '/login') {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        const to = searchParams.get('redirect') || '/dashboard'
        const url = req.nextUrl.clone()
        url.pathname = to
        url.search = ''
        return NextResponse.redirect(url)
      }
    }
    return res
  }

  // 需要登入的區域
  if (pathname.startsWith('/dashboard')) {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  return res
}

export const config = {
  matcher: ['/:path*'],
}