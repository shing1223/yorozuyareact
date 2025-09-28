// components/dreams/DreamCard.tsx
"use client"

import { useEffect, useState } from "react"
import { createSupabaseBrowser } from "@/lib/supabase-browser"

const supabase = createSupabaseBrowser()

type Dream = {
  id: string
  user_id: string
  title: string
  public_content: string
  hidden_content: string | null
  created_at: string
  up_count: number
  down_count: number
}

export default function DreamCard({ dream }: { dream: Dream }) {
  const [meVote, setMeVote] = useState<1 | -1 | 0>(0)
  const [up, setUp] = useState(dream.up_count)
  const [down, setDown] = useState(dream.down_count)
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState<any[]>([])
  const [ready, setReady] = useState(false) // auth 初始化完成

  // 取得目前使用者投票狀態
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setReady(true)
      const user = session?.user
      if (!user) { setMeVote(0); return }
      const { data } = await supabase
        .from("dream_votes")
        .select("value")
        .eq("dream_id", dream.id)
        .eq("user_id", user.id)
        .maybeSingle()
      if (!cancelled) {
        setMeVote(data?.value === 1 ? 1 : data?.value === -1 ? -1 : 0)
      }
    })()
    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      // 使用者登入/登出時重新讀
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { setMeVote(0); return }
      const { data } = await supabase
        .from("dream_votes")
        .select("value")
        .eq("dream_id", dream.id)
        .eq("user_id", user.id)
        .maybeSingle()
      setMeVote(data?.value === 1 ? 1 : data?.value === -1 ? -1 : 0)
    })
    return () => { cancelled = true; sub.subscription.unsubscribe() }
  }, [dream.id])

  // 讀取留言
  const loadComments = async () => {
    const { data } = await supabase
      .from("dream_comments")
      .select("id, body, user_id, created_at")
      .eq("dream_id", dream.id)
      .order("created_at", { ascending: true })
    setComments(data || [])
  }
  useEffect(() => { loadComments() }, [dream.id])

  const ensureLogin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session.user
    // 導去登入並回跳當前頁
    window.location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`
    throw new Error("NOT_LOGGED_IN")
  }

  // 投票
  const vote = async (value: 1 | -1) => {
    try {
      const user = await ensureLogin()
      const prev = meVote

      // 樂觀更新（用函數式 setState，避免用到過期值）
      if (value === 1) {
        setUp(u => u + (prev === 1 ? -1 : 1) + (prev === -1 ? 1 : 0))
        setDown(d => (prev === -1 ? d - 1 : d))
        setMeVote(prev === 1 ? 0 : 1)
      } else {
        setDown(d => d + (prev === -1 ? -1 : 1) + (prev === 1 ? 1 : 0))
        setUp(u => (prev === 1 ? u - 1 : u))
        setMeVote(prev === -1 ? 0 : -1)
      }

      // Upsert / 刪除
      if (prev === value) {
        await supabase.from("dream_votes")
          .delete()
          .eq("dream_id", dream.id)
          .eq("user_id", user.id)
      } else {
        // 建議後端把 dream_votes.user_id 預設為 auth.uid()，則這裡可以不傳 user_id
        await supabase.from("dream_votes")
          .upsert({ dream_id: dream.id, user_id: user.id, value })
      }
    } catch (e) {
      // 被導去登入，不需要 alert
      if ((e as Error).message !== "NOT_LOGGED_IN") {
        console.error(e)
      }
    }
  }

  // 留言
  const postComment = async () => {
    try {
      const user = await ensureLogin()
      const body = comment.trim()
      if (!body) return
      setComment("")
      await supabase.from("dream_comments").insert({ dream_id: dream.id, user_id: user.id, body })
      loadComments()
    } catch (e) {
      if ((e as Error).message !== "NOT_LOGGED_IN") {
        console.error(e)
      }
    }
  }

  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{dream.title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-gray-800">{dream.public_content}</p>

      {dream.hidden_content ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <div className="font-medium">隱藏內容（投資者可見）</div>
          <div className="mt-1 whitespace-pre-wrap">{dream.hidden_content}</div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-gray-400">此夢想沒有隱藏內容</div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => vote(1)}
          disabled={!ready}
          className={`rounded-lg px-3 py-1.5 text-sm border ${meVote === 1 ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"}`}
        >
          支持（{up}）
        </button>
        <button
          onClick={() => vote(-1)}
          disabled={!ready}
          className={`rounded-lg px-3 py-1.5 text-sm border ${meVote === -1 ? "bg-gray-700 text-white border-gray-700" : "bg-white"}`}
        >
          反對（{down}）
        </button>
      </div>

      {/* 留言 */}
      <div className="mt-4 border-t pt-3">
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            placeholder="留言⋯⋯"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button onClick={postComment} disabled={!ready} className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">
            發送
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg bg-gray-50 p-2 text-sm">
              <div className="text-gray-700 whitespace-pre-wrap">{c.body}</div>
              <div className="mt-1 text-[11px] text-gray-400">{new Date(c.created_at).toLocaleString()}</div>
            </li>
          ))}
          {!comments.length && <div className="text-xs text-gray-400">尚無留言</div>}
        </ul>
      </div>
    </article>
  )
}