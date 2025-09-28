// components/dreams/NewDreamForm.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseBrowser } from "@/lib/supabase-browser"

export default function NewDreamForm() {
  const sb = createSupabaseBrowser()
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [pub, setPub] = useState("")
  const [hidden, setHidden] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg(null)

    try {
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.user) {
        setMsg("請先登入再發佈。")
        setLoading(false)
        return
      }

      // 只送必要欄位；user_id 交給 DB 預設 auth.uid()（若你已設定）
      const { data: dream, error } = await sb
        .from("dreams")
        .insert({ title, public_content: pub })
        .select("id")
        .single()

      if (error) throw error

      if (hidden.trim()) {
        const { error: e2 } = await sb
          .from("dreams_secret")
          .insert({ dream_id: dream!.id, hidden_content: hidden })
        if (e2) throw e2
      }

      // 成功 → 導去詳情頁
      router.push(`/dreams/${dream!.id}`)
    } catch (err: any) {
      // 把「Load failed / fetch 被攔」類型也轉成人類可讀
      const text = err?.message || String(err)
      if (/load failed/i.test(text)) {
        setMsg("建立失敗：網路/快取攔截異常（可能是離線或 PWA 快取干擾）。請重試。")
      } else {
        setMsg("建立失敗：" + text)
      }
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
      <input
        className="w-full rounded-lg border px-3 py-2"
        placeholder="夢想標題（最多 120 字）"
        maxLength={120}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />
      <textarea
        className="w-full rounded-lg border px-3 py-2"
        placeholder="公開內容（所有人可見）"
        rows={4}
        value={pub}
        onChange={(e) => setPub(e.target.value)}
        required
      />
      <textarea
        className="w-full rounded-lg border px-3 py-2"
        placeholder="隱藏內容（只有投資者能看到，可留空）"
        rows={3}
        value={hidden}
        onChange={(e) => setHidden(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button
          disabled={loading}
          className="rounded-lg bg-red-500 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "發佈中…" : "發佈"}
        </button>
        {msg && <div className="text-sm text-gray-600">{msg}</div>}
      </div>
    </form>
  )
}