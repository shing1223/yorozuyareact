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
  const [saving, setSaving] = useState(false)
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
    if (saving) return
    setMsg(null)
    setSaving(true)
    const name = displayName.trim() || null
    const { error } = await sb.auth.updateUser({ data: { display_name: name } })
    setSaving(false)
    if (error) { setMsg(`儲存失敗：${error.message}`); return }
    setMsg("已儲存")
    router.refresh()
  }

  if (loading) {
    return (
      <div
        className="rounded-2xl border bg-white p-6 text-gray-500 shadow-sm
                   border-gray-200 dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-400"
      >
        載入中…
      </div>
    )
  }

  return (
    <form
      onSubmit={onSave}
      className="space-y-4 rounded-2xl border bg-white p-4 shadow-sm
                 border-gray-200 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="text-sm text-gray-500 dark:text-gray-400">登入 Email</div>
      <div
        className="rounded-lg border bg-gray-50 px-3 py-2 text-sm
                   border-gray-200 text-gray-700
                   dark:border-neutral-800 dark:bg-neutral-800 dark:text-gray-200"
      >
        {email}
      </div>

      <label className="block">
        <div className="mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          顯示名稱（Display name）
        </div>
        <input
          className="w-full rounded-lg border px-3 py-2
                     border-gray-300 text-gray-900 placeholder:text-gray-400
                     focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400
                     dark:border-neutral-700 dark:bg-neutral-950 dark:text-gray-100 dark:placeholder:text-neutral-500
                     dark:focus:ring-white/10 dark:focus:border-neutral-500"
          placeholder="例如：阿新、Shing"
          value={displayName}
          onChange={(e)=>setDisplayName(e.target.value)}
          maxLength={50}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          className="rounded-lg bg-black px-4 py-2 text-white active:scale-95
                     disabled:opacity-60 disabled:active:scale-100
                     dark:bg-white dark:text-black"
          disabled={saving}
        >
          {saving ? "儲存中…" : "儲存"}
        </button>
        {msg && (
          <span
            className="text-sm text-gray-600 dark:text-gray-400"
            aria-live="polite"
          >
            {msg}
          </span>
        )}
      </div>
    </form>
  )
}