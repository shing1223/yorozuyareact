// components/dreams/NewDreamForm.tsx
"use client"

import { useMemo, useState } from "react"
import { createSupabaseBrowser } from "@/lib/supabase-browser"

export default function NewDreamForm() {
  // ✅ 在元件內、且用 useMemo 確保整個生命週期穩定
  const supabase = useMemo(() => createSupabaseBrowser(), [])

  const [title, setTitle] = useState("")
  const [pub, setPub] = useState("")
  const [hidden, setHidden] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setErr(null)

    const t = title.trim()
    const p = pub.trim()
    const h = hidden.trim()

    if (!t) { setErr("請輸入標題"); return }
    if (!p) { setErr("請輸入公開內容"); return }

    setLoading(true)
    try {
      // ✅ 用 getSession，比 getUser 更穩（初次載入/刷新後）
      const { data: { session }, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw new Error(`讀取登入狀態失敗：${sessErr.message}`)
      if (!session?.user) {
        setErr("請先登入再發佈。")
        return
      }

      // ✅ 不要從前端送 user_id，讓 DB 用 auth.uid()（見下方 RLS/trigger 設定）
      const { data: dream, error } = await supabase
        .from("dreams")
        .insert({ title: t, public_content: p }) // ← 不含 user_id
        .select("id")
        .single()

      if (error) throw error

      // （可選）寫入隱藏內容（確保 RLS 允許：僅 dream.owner 可插入）
      if (h) {
        const { error: e2 } = await supabase
          .from("dreams_secret")
          .insert({ dream_id: dream!.id, hidden_content: h })
        if (e2) throw new Error(`隱藏內容存檔失敗：${e2.message}`)
      }

      setMsg("發佈成功！即將跳轉⋯")
      setTitle(""); setPub(""); setHidden("")
      // 導回詳情
      window.location.assign(`/dreams/${dream!.id}`)
    } catch (e: any) {
      setErr(e?.message || "建立失敗")
    } finally {
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

      {(err || msg) && (
        <div className={`text-sm ${err ? "text-red-600" : "text-green-600"}`}>
          {err || msg}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={loading}
          className="rounded-lg bg-red-500 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "發佈中…" : "發佈"}
        </button>
      </div>
    </form>
  )
}