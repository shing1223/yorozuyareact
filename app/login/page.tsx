// app/login/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function LoginPage() {
  const supabase = createSupabaseBrowser()
  const sp = useSearchParams()
  const redirect = sp.get('redirect') ?? '/dashboard'

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ✅ 已登入就自動導回
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (data.session) window.location.replace(redirect)
    })
    return () => { mounted = false }
  }, [redirect, supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null); setMessage(null)
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw new Error(error.message || 'Invalid login credentials')

        const access_token = data.session?.access_token
        const refresh_token = data.session?.refresh_token
        if (!access_token || !refresh_token) throw new Error('no_session_tokens')

        const r = await fetch('/api/auth/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token }),
        })
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(`${j?.error || 'failed_to_set_server_session'} ${j?.detail || ''}`.trim())
        }

        window.location.assign(redirect) // 硬導頁，確保 middleware 讀到 cookie
        return
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        setMessage('註冊成功！若啟用信箱驗證，請先到信箱完成驗證再登入。')
        setMode('signin')
      }
    } catch (err: any) {
      setError(err?.message || '發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{mode === 'signin' ? '登入' : '建立帳號'}</h1>
        <p className="text-sm text-gray-500">
          {mode === 'signin' ? '使用 Email 與密碼登入' : '使用 Email 與密碼註冊新帳號'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Email</label>
          <input
            className="w-full border rounded p-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600">Password</label>
          <input
            className="w-full border rounded p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && <div className="text-sm text-green-600">{message}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? '處理中…' : (mode === 'signin' ? '登入' : '建立帳號')}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button
          className="underline"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? '還沒有帳號？建立帳號' : '已經有帳號？改為登入'}
        </button>

        {/* 忘記密碼：導到你實作的 reset 頁（可先留空頁） */}
        <a className="underline" href="/reset">忘記密碼？</a>
      </div>
    </main>
  )
}