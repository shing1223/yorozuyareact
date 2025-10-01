// app/reset/callback/page.tsx
'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export const dynamic = 'force-dynamic' // 避免 SSG

function ResetCallbackInner() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const sp = useSearchParams()

  // 僅允許站內路徑，避免 open redirect
  const redirect = useMemo(() => {
    const raw = sp.get('redirect') || '/login'
    return raw.startsWith('/') ? raw : '/login'
  }, [sp])

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null)

  // ✅ 進頁面時，確保有可用的 recovery session
  useEffect(() => {
    let alive = true

    const ensureSession = async () => {
      // 1) 已有 session？
      const { data: s1 } = await supabase.auth.getSession()
      if (!alive) return
      if (s1.session) {
        setHasRecoverySession(true)
        return
      }

      // 2) 嘗試 ?code=...（PKCE / recovery）
      const urlHasCode = typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('code')
      if (urlHasCode) {
        try {
          const { data: s2, error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (!alive) return
          if (!error && s2?.session) {
            setHasRecoverySession(true)
            return
          }
        } catch { /* noop */ }
      }

      // 3) 嘗試 #access_token=...（舊式 hash）
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        const hash = new URLSearchParams(window.location.hash.slice(1))
        const access_token = hash.get('access_token') || ''
        const refresh_token = hash.get('refresh_token') || ''
        if (access_token && refresh_token) {
          try {
            const { data: s3, error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (!alive) return
            if (!error && s3?.session) {
              setHasRecoverySession(true)
              return
            }
          } catch { /* noop */ }
        }
      }

      // 都沒有 → 顯示錯誤
      setHasRecoverySession(false)
    }

    ensureSession()
    return () => { alive = false }
  }, [supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setMsg(null)

    if (!hasRecoverySession) {
      setErr('重設連結無效或已過期，請重新申請重設密碼。')
      return
    }
    if (password.length < 8) return setErr('密碼至少需要 8 碼')
    if (password !== password2) return setErr('兩次輸入的密碼不一致')

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) return setErr(error.message)

    setMsg('密碼已更新，請重新登入')
    setTimeout(() => router.replace(redirect), 1200)
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="夢想" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4">
          <h2 className="text-xl font-bold">重設密碼</h2>
          <p className="text-sm text-gray-600">請輸入新密碼並確認。</p>
        </div>

        <div className="mx-auto max-w-sm">
          {/* hasRecoverySession === null → 正在確認 session */}
          {hasRecoverySession === false && (
            <div className="mb-3 rounded-lg border bg-white p-4 text-sm text-red-600">
              重設連結無效或已過期，請回到
              <a href="/reset" className="underline"> 重設頁</a> 重新申請。
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
            <input
              type="password"
              className="w-full border rounded p-2"
              placeholder="新密碼（至少 8 碼）"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              minLength={8}
              required
            />
            <input
              type="password"
              className="w-full border rounded p-2"
              placeholder="再次輸入新密碼"
              value={password2}
              onChange={(e)=>setPassword2(e.target.value)}
              minLength={8}
              required
            />

            {err && <div className="text-sm text-red-600">{err}</div>}
            {msg && <div className="text-sm text-green-600">{msg}</div>}

            <button
              type="submit"
              disabled={loading || hasRecoverySession === false}
              className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
            >
              {loading ? '處理中…' : '更新密碼'}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetCallbackInner />
    </Suspense>
  )
}