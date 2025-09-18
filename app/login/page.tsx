// app/login/page.tsx
'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const dynamic = 'force-dynamic' // 避免預先靜態化（保險）

function LoginForm() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const sp = useSearchParams()           // ← 現在在 Suspense 之內
  const redirect = sp.get('redirect') ?? '/dashboard'

  const [mode, setMode] = useState<'signin'|'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null); setMessage(null)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error

        // 導回（硬導以確保 middleware 讀到 cookie）
        window.location.assign(redirect)
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) throw error
        setMessage('註冊成功！若啟用信箱驗證，請先至信箱完成驗證再登入。')
        setMode('signin')
      }
    } catch (err: any) {
      setError(`${err?.name || ''} ${err?.status || ''} ${err?.message || '發生錯誤'}`)
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
          <input className="w-full border rounded p-2" type="email"
                 value={email} onChange={(e) => setEmail(e.target.value)}
                 placeholder="you@example.com" required />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600">Password</label>
          <input className="w-full border rounded p-2" type="password"
                 value={password} onChange={(e) => setPassword(e.target.value)}
                 placeholder="••••••••" required />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {message && <div className="text-sm text-green-600">{message}</div>}

        <button type="submit" disabled={loading}
                className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60">
          {loading ? '處理中…' : (mode === 'signin' ? '登入' : '建立帳號')}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button className="underline"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? '還沒有帳號？建立帳號' : '已經有帳號？改為登入'}
        </button>
        <a className="underline" href="/reset">忘記密碼？</a>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-sm p-6">載入中…</main>}>
      <LoginForm />
    </Suspense>
  )
}