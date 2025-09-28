// components/dreams/NewDreamForm.tsx
"use client"

import { useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function NewDreamForm() {
  const [title, setTitle] = useState("")
  const [pub, setPub] = useState("")
  const [hidden, setHidden] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setMsg(null)

    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      setMsg("請先登入再發佈。")
      setLoading(false)
      return
    }

    const { data: dream, error } = await supabase
      .from("dreams")
      .insert({ title, public_content: pub, user_id: user.id })
      .select("id")
      .single()

    if (error) {
      setMsg("建立失敗：" + error.message)
      setLoading(false)
      return
    }

    if (hidden.trim()) {
      const { error: e2 } = await supabase
        .from("dreams_secret")
        .insert({ dream_id: dream!.id, hidden_content: hidden })
      if (e2) {
        setMsg("隱藏內容存檔失敗：" + e2.message)
        setLoading(false)
        return
      }
    }

    setMsg("發佈成功！")
    setTitle(""); setPub(""); setHidden("")
    // 簡單刷新
    window.location.reload()
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