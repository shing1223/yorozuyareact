// app/reset/callback/page.tsx
'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AppHeader from '@/components/AppHeader'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function ResetCallbackPage() {
  const supabase = createSupabaseBrowser()
  const router = useRouter()
  const sp = useSearchParams()
  const redirect = sp.get('redirect') || '/login'

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setMsg(null)

    if (password.length < 8) {
      setErr('密碼至少需要 8 碼')
      return
    }
    if (password !== password2) {
      setErr('兩次輸入的密碼不一致')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setErr(error.message)
      return
    }

    setMsg('密碼已更新，請重新登入')
    setTimeout(() => {
      router.replace(redirect)
    }, 1800)
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="夢想" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4">
          <h2 className="text-xl font-bold">重設密碼</h2>
          <p className="text-sm text-gray-600">請輸入新密碼並確認。</p>
        </div>

        <div className="mx-auto max-w-sm">
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
              disabled={loading}
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