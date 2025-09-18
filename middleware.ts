import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  // 一定要以這個 res 回傳，因為我們會往上面寫 cookie
  const res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => {
          res.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 })
        }
      }
    }
  )

  // 這一行會讓 auth-helpers 在每次請求時把最新 session 寫回 cookie
  await supabase.auth.getSession()

  return res
}

export const config = {
  // 讓 middleware 跑在所有頁面與 API（你也可以縮小範圍）
  matcher: ['/((?!_next|favicon|assets|.*\\.(?:png|jpg|jpeg|svg|ico)).*)'],
}