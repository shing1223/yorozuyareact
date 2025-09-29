'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import AppHeader from '@/components/AppHeader'

export default function ResetCallbackPage() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // 當使用者點郵件的重設連結，Supabase 會自動建立 session
  // 這裡檢查是否有 session（有才可以 updateUser）
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSessionReady(true)
      } else {
        setErr('驗證連結無效或已過期，請重新送出重設請求。')
      }
    })
  }, [supabase])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setMsg(null)

    if (password.length < 6) {
      setErr('密碼至少需 6 位字元')
      return
    }
    if (password !== confirm) {
      setErr('兩次輸入的密碼不一致')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setErr(error.message)
    } else {
      setMsg('密碼已更新，請重新登入。')
      // 可選：自動跳轉回登入頁
      setTimeout(() => router.replace('/login'), 2000)
    }
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="首頁" />

      <section className="px-4 py-6 pb-24">
        <h2 className="text-xl font-bold mb-4">設定新密碼</h2>

        <div className="mx-auto max-w-sm space-y-4">
          {!sessionReady ? (
            <div className="rounded-2xl border bg-white p-4 shadow-sm text-red-600">
              {err ?? '載入中…'}
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
            >
              <input
                className="w-full border rounded p-2"
                type="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="輸入新密碼"
                required
              />
              <input
                className="w-full border rounded p-2"
                type="password"
                value={confirm}
                onChange={(e)=>setConfirm(e.target.value)}
                placeholder="再次輸入新密碼"
                required
              />
              {err && <div className="text-sm text-red-600">{err}</div>}
              {msg && <div className="text-sm text-green-600">{msg}</div>}
              <button
                className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
                disabled={loading}
              >
                {loading ? '更新中…' : '更新密碼'}
              </button>
            </form>
          )}

          <div className="text-sm text-gray-600">
            <Link href="/login" className="underline">回登入頁</Link>
          </div>
        </div>
      </section>
    </main>
  )
}