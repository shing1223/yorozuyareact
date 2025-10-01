// components/dreams/DreamCard.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { createSupabaseBrowser } from "@/lib/supabase-browser"

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
  const supabase = useMemo(() => createSupabaseBrowser(), [])
  const [meVote, setMeVote] = useState<1 | -1 | 0>(0)
  const [up, setUp] = useState(dream.up_count)
  const [down, setDown] = useState(dream.down_count)
  const [comment, setComment] = useState("")
  const [comments, setComments] = useState<any[]>([])
  const [ready, setReady] = useState(false)

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
  }, [supabase, dream.id])

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
    window.location.href = `/login?redirect=${encodeURIComponent(location.pathname)}`
    throw new Error("NOT_LOGGED_IN")
  }

  // 投票
  const vote = async (next: 1 | -1) => {
    try {
      const user = await ensureLogin()
      const prev = meVote

      // 樂觀更新
      if (next === 1) {
        setMeVote(prev === 1 ? 0 : 1)
        setUp(u => u + (prev === 1 ? -1 : 1))
        setDown(d => (prev === -1 ? d - 1 : d))
      } else {
        setMeVote(prev === -1 ? 0 : -1)
        setDown(d => d + (prev === -1 ? -1 : 1))
        setUp(u => (prev === 1 ? u - 1 : u))
      }

      // 寫回
      if (prev === next) {
        await supabase.from("dream_votes").delete()
          .eq("dream_id", dream.id).eq("user_id", user.id)
      } else {
        await supabase.from("dream_votes")
          .upsert({ dream_id: dream.id, user_id: user.id, value: next })
      }
    } catch (e) {
      if ((e as Error).message !== "NOT_LOGGED_IN") console.error(e)
    }
  }

  // 留言
  const postComment = async () => {
    try {
      await ensureLogin()
      const body = comment.trim()
      if (!body) return
      setComment("")
      await supabase.from("dream_comments").insert({ dream_id: dream.id, body })
      loadComments()
    } catch (e) {
      if ((e as Error).message !== "NOT_LOGGED_IN") console.error(e)
    }
  }

  // 共用欄位樣式（含 dark）
  const inputBase =
    "rounded-lg border px-3 py-2 text-sm outline-none " +
    "bg-white text-gray-900 placeholder-gray-400 border-gray-200 " +
    "focus:border-transparent focus:ring-2 focus:ring-red-500/60 " +
    "dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-400 dark:border-gray-700 " +
    "dark:focus:ring-red-500/70"

  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm
                        border-gray-200 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {dream.title}
      </h3>

      <p className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
        {dream.public_content}
      </p>

      {dream.hidden_content ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900
                        dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          <div className="font-medium">隱藏內容（投資者可見）</div>
          <div className="mt-1 whitespace-pre-wrap">{dream.hidden_content}</div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-gray-400 dark:text-gray-500">
          成為投資者才可看到隱藏內容
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => vote(1)}
          disabled={!ready}
          className={`rounded-lg px-3 py-1.5 text-sm border transition
            ${meVote === 1
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 " +
                "dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"}`}
        >
          支持🚀（{up}）
        </button>
        <button
          onClick={() => vote(-1)}
          disabled={!ready}
          className={`rounded-lg px-3 py-1.5 text-sm border transition
            ${meVote === -1
              ? "bg-gray-700 text-white border-gray-700"
              : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50 " +
                "dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"}`}
        >
          冷靜思考❓（{down}）
        </button>
      </div>

      {/* 留言 */}
      <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            className={`flex-1 ${inputBase}`}
            placeholder="留言⋯⋯"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            onClick={postComment}
            disabled={!ready}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-60
                       hover:bg-black active:scale-[0.99]
                       dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
          >
            發送
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="rounded-lg bg-gray-50 p-2 text-sm
                         dark:bg-gray-800/70"
            >
              <div className="text-gray-700 whitespace-pre-wrap dark:text-gray-200">
                {c.body}
              </div>
              <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                {new Date(c.created_at).toLocaleString()}
              </div>
            </li>
          ))}
          {!comments.length && (
            <div className="text-xs text-gray-400 dark:text-gray-500">尚無留言</div>
          )}
        </ul>
      </div>
    </article>
  )
}