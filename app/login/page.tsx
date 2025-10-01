'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import AppHeader from '@/components/AppHeader'

function LoginInner() {
  const sp = useSearchParams()
  const supabase = createSupabaseBrowser()

  const DEFAULT_REDIRECT = '/'
  const raw = sp.get('redirect')
  const redirect = raw && raw.startsWith('/') ? raw : DEFAULT_REDIRECT

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setErr(null); setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      const msg = error.message.toLowerCase().includes('email not confirmed')
        ? '帳號尚未驗證，請至信箱完成驗證後再登入。'
        : error.status === 400
          ? '帳號或密碼不正確。'
          : error.message
      setErr(msg)
      return
    }
    // 讓 cookie 寫入；用 assign 觸發完整重載
    window.location.assign(redirect)
  }

  // 保留監聽（避免外部登入狀態變動時畫面不同步）
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {})
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="首頁" />
      <section className="px-4 py-6 pb-24">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">登入</h2>

        <div className="mx-auto max-w-sm space-y-4">
          <form
            onSubmit={onSubmit}
            className="space-y-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm"
          >
            <input
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2"
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="email@example.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
            <input
              className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2"
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            {err && <div className="text-sm text-red-600">{err}</div>}
            <button
              className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? '處理中…' : '登入'}
            </button>
          </form>

          {/* 補齊連結（/signup & /reset） */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
            <Link href="/signup" className="underline">
              還沒有帳號？建立帳號
            </Link>
            <Link href="/reset" className="underline">
              忘記密碼？
            </Link>
          </div>
        </div>
      </section>
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