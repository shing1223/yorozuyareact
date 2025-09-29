'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowser } from '@/lib/supabase-browser'
import AppHeader from '@/components/AppHeader'

export default function ResetPage() {
  const supabase = createSupabaseBrowser()
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr(null); setMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset/callback`,
    })
    setLoading(false)
    if (error) return setErr(error.message)
    setMsg('已寄出密碼重設連結，請檢查信箱。')
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="首頁" />
      <section className="px-4 py-6 pb-24">
        <h2 className="text-xl font-bold mb-4">重設密碼</h2>
        <div className="mx-auto max-w-sm space-y-4">
          <form
            onSubmit={onSubmit}
            className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm"
          >
            <input
              className="w-full border rounded p-2"
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
            {err && <div className="text-sm text-red-600">{err}</div>}
            {msg && <div className="text-sm text-green-600">{msg}</div>}
            <button
              className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? '處理中…' : '送出重設連結'}
            </button>
          </form>

          <div className="text-sm text-gray-600">
            <Link href="/login" className="underline">回登入頁</Link>
          </div>
        </div>
      </section>
    </main>
  )
}