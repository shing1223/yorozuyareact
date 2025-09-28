'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

function LoginInner() {
  const sp = useSearchParams()
  const supabase = createSupabaseBrowser()

  // 只接受站內相對路徑，預設回首頁
  const DEFAULT_REDIRECT = '/'
  const raw = sp.get('redirect')
  const redirect = raw && raw.startsWith('/') ? raw : DEFAULT_REDIRECT

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setErr(error.message); return }
    // 讓 middleware 有機會在下一次請求把 cookie 帶好
    window.location.assign(redirect)   // ← 登入後回首頁（或 query 指定的站內路徑）
  }

  // （可選）監聽 auth 狀態；不做導向，以免與上面流程衝突
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {})
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">登入</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          type="email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        <input
          className="w-full border rounded p-2"
          type="password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button
          className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? '處理中…' : '登入'}
        </button>
      </form>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}