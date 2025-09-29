// app/settings/SettingsClient.tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabase-browser"

export default function SettingsClient() {
  const sb = createSupabaseBrowser()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.user) {
        window.location.href = `/login?redirect=${encodeURIComponent("/settings")}`
        return
      }
      setEmail(session.user.email ?? "")
      setDisplayName((session.user.user_metadata as any)?.display_name ?? "")
      setLoading(false)
    })()
  }, [sb])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const name = displayName.trim() || null
    const { error } = await sb.auth.updateUser({ data: { display_name: name } })
    if (error) { setMsg(`儲存失敗：${error.message}`); return }
    setMsg("已儲存")
    router.refresh()
  }

  if (loading) {
    return <div className="rounded-2xl border bg-white p-6 text-gray-500">載入中…</div>
  }

  return (
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
  )
}