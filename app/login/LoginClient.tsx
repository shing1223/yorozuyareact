'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function LoginClient({ redirect }: { redirect: string }) {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // 若已登入，直接重導（避免留在登入頁）
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (data.session) {
        router.replace(redirect)
        router.refresh()
      }
    })
    return () => {
      mounted = false
    }
  }, [router, supabase, redirect])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErr(null)
    setMsg(null)

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            throw new Error('帳號尚未驗證，請至信箱完成驗證後登入。')
          }
          if (error.status === 400) throw new Error('帳號或密碼不正確，或使用者不存在。')
          throw error
        }
        // 成功 → 交給 middleware 寫 cookie，這裡直接跳轉
        router.replace(redirect)
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // 若你有 email 驗證，回跳路徑填你自己的：
            emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirect)}`,
          },
        })
        if (error) throw error
        if (data.user?.email) {
          setMsg('註冊成功！若有啟用信箱驗證，請至信箱完成驗證後再登入。')
          setMode('signin')
        }
      }
    } catch (e: any) {
      setErr(e?.message || '發生錯誤')
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
            placeholder="name@yourdomain.com"
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
            placeholder="•••••••••"
            required
          />
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}
        {msg && <div className="text-sm text-green-600">{msg}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? '處理中…' : (mode === 'signin' ? '登入' : '建立帳號')}
        </button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <button className="underline" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? '還沒有帳號？建立帳號' : '已經有帳號？改為登入'}
        </button>
        <a className="underline" href="/reset">忘記密碼？</a>
      </div>
    </main>
  )
}