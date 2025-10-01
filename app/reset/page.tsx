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
    if (loading) return

    const value = email.trim()
    setErr(null); setMsg(null)

    // 最基本的 email 檢查（瀏覽器也會檢查，但先擋一次）
    if (!value || !/^\S+@\S+\.\S+$/.test(value)) {
      setErr('請輸入正確的 Email')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: `${window.location.origin}/reset/callback`,
      })
      if (error) throw error
      setMsg('已寄出密碼重設連結，請檢查信箱。')
    } catch (e: any) {
      setErr(e?.message || '送出失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="首頁" />

      <section className="px-4 py-6 pb-24">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">重設密碼</h2>

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

            {err && <div className="text-sm text-red-600">{err}</div>}
            {msg && <div className="text-sm text-green-600">{msg}</div>}

            <button
              type="submit"
              className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? '處理中…' : '送出重設連結'}
            </button>
          </form>

          <div className="text-sm text-gray-600 dark:text-gray-300">
            <Link href="/login" className="underline">回登入頁</Link>
          </div>
        </div>
      </section>
    </main>
  )
}