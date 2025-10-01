'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function SignupPage() {
  const supabase = createSupabaseBrowser()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setMsg(null)

    if (!displayName.trim()) { setErr('請輸入顯示名稱'); return }
    if (!phone.trim())       { setErr('請輸入電話'); return }
    if (password.length < 8) { setErr('密碼至少需要 8 碼'); return }
    if (password !== password2) { setErr('兩次輸入的密碼不一致'); return }

    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
          phone: phone.trim(),
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    setLoading(false)

    if (error) {
      setErr(error.message)
      return
    }
    if (data.user) {
      setMsg('註冊成功！若啟用信箱驗證，請至信箱完成驗證後再登入。')
    }
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="首頁" />
      <section className="px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">建立帳號</h2>
        </div>

        <div className="mx-auto max-w-sm">
          <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
            <input
              className="w-full border rounded p-2"
              placeholder="顯示名稱（必填）"
              value={displayName}
              onChange={(e)=>setDisplayName(e.target.value)}
              maxLength={50}
              required
            />
            <input
              className="w-full border rounded p-2"
              placeholder="電話（必填）"
              value={phone}
              onChange={(e)=>setPhone(e.target.value)}
              pattern="^[0-9+\-\s()]{6,}$"
              title="請輸入正確的電話"
              required
            />
            <input
              className="w-full border rounded p-2"
              type="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
            <input
              className="w-full border rounded p-2"
              type="password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              placeholder="設定密碼（至少 8 碼）"
              minLength={8}
              required
            />
            <input
              className="w-full border rounded p-2"
              type="password"
              value={password2}
              onChange={(e)=>setPassword2(e.target.value)}
              placeholder="再次輸入密碼"
              minLength={8}
              required
            />

            {err && <div className="text-sm text-red-600">{err}</div>}
            {msg && <div className="text-sm text-green-600">{msg}</div>}

            <button
              className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
              disabled={loading}
            >
              {loading ? '處理中…' : '建立帳號'}
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <Link href="/login" className="underline">已經有帳號？改為登入</Link>
            <Link href="/reset" className="underline">忘記密碼？</Link>
          </div>
        </div>
      </section>
    </main>
  )
}