// app/settings/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function SettingsPage() {
  const sb = createSupabaseBrowser()
  const router = useRouter()
  const sp = useSearchParams()
  const [email, setEmail] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.user) {
        // 未登入就導去登入，回來到 /settings
        const back = sp?.get('redirect') ?? '/settings'
        window.location.href = `/login?redirect=${encodeURIComponent(back)}`
        return
      }
      setEmail(session.user.email ?? '')
      setDisplayName((session.user.user_metadata as any)?.display_name ?? '')
      setLoading(false)
    })()
  }, [sb, sp])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const name = displayName.trim()
    // 寫入 auth.user_metadata
    const { error } = await sb.auth.updateUser({ data: { display_name: name || null } })
    if (error) { setMsg(`儲存失敗：${error.message}`); return }
    setMsg('已儲存')
    // 讓 Nav/其他頁立即拿到最新的 metadata
    router.refresh()
  }

  if (loading) return <main className="mx-auto max-w-[640px] p-6">載入中…</main>

  return (
    <main className="mx-auto max-w-[640px] p-6 space-y-5">
      <h1 className="text-2xl font-bold">帳號設定</h1>

      <form onSubmit={onSave} className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-sm text-gray-500">登入 Email</div>
        <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">{email}</div>

        <label className="block">
          <div className="mb-1 text-sm font-medium">顯示名稱（Display name）</div>
          <input
            className="w-full rounded-lg border px-3 py-2"
            placeholder="例如：阿新、Shing"
            value={displayName}
            onChange={(e)=>setDisplayName(e.target.value)}
            maxLength={50}
          />
        </label>

        <div className="flex items-center gap-3">
          <button className="rounded-lg bg-black px-4 py-2 text-white active:scale-95">
            儲存
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </form>
    </main>
  )
}