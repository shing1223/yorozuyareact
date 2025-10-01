// components/dreams/NewDreamForm.tsx
"use client"
import { useMemo, useState } from "react"
import { createSupabaseBrowser } from "@/lib/supabase-browser"

export default function NewDreamForm() {
  const supabase = useMemo(() => createSupabaseBrowser(), [])
  const [title, setTitle] = useState("")
  const [pub, setPub] = useState("")
  const [hidden, setHidden] = useState("")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true); setMsg(null)

    try {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession()
      if (sessErr) throw new Error("讀取登入狀態失敗：" + sessErr.message)
      const user = session?.user
      if (!user) throw new Error("請先登入再發佈。")

      const t = title.trim()
      const pc = pub.trim()
      if (!t || !pc) throw new Error("標題與公開內容為必填")

      const { data: dream, error } = await supabase
        .from("dreams")
        .insert({ title: t, public_content: pc, user_id: user.id })
        .select("id")
        .single()
      if (error) throw new Error("建立失敗：" + error.message)

      if (hidden.trim()) {
        const { error: e2 } = await supabase
          .from("dreams_secret")
          .insert({ dream_id: dream!.id, hidden_content: hidden })
        if (e2) throw new Error("隱藏內容存檔失敗：" + e2.message)
      }

      setMsg("發佈成功！")
      setTitle(""); setPub(""); setHidden("")
      window.location.assign(`/dreams/${dream!.id}`)
    } catch (err: any) {
      setMsg(err?.message || "發生錯誤")
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
      <div className="flex items-center gap-3">
        <button disabled={loading} className="rounded-lg bg-red-500 px-4 py-2 text-white disabled:opacity-50">
          {loading ? "發佈中…" : "發佈"}
        </button>
        {msg && <div className="text-sm text-gray-600">{msg}</div>}
      </div>
    </form>
  )
}