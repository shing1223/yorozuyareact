// components/dreams/DreamCard.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

  // 讀取我對此夢想的投票
  useEffect(() => {
    (async () => {
      const u = (await supabase.auth.getUser()).data.user
      if (!u) return
      const { data } = await supabase
        .from("dream_votes")
        .select("value")
        .eq("dream_id", dream.id)
        .eq("user_id", u.id)
        .maybeSingle()
      if (data?.value === 1) setMeVote(1)
      else if (data?.value === -1) setMeVote(-1)
      else setMeVote(0)
    })()
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

  // 投票
  const vote = async (value: 1 | -1) => {
    const u = (await supabase.auth.getUser()).data.user
    if (!u) return alert("請先登入")
    const optimisticPrev = meVote

    // 樂觀更新
if (value === 1) {
  setUp(up + (meVote === 1 ? -1 : 1) + (meVote === -1 ? 1 : 0))

  if (meVote === 1) {
    setMeVote(0)
  } else {
    setMeVote(1)
  }

  if (meVote === -1) {
    setDown(down - 1)
  }
} else {
  setDown(down + (meVote === -1 ? -1 : 1) + (meVote === 1 ? 1 : 0))

  if (meVote === -1) {
    setMeVote(0)
  } else {
    setMeVote(-1)
  }

  if (meVote === 1) {
    setUp(up - 1)
  }
}

    // Upsert / 刪除
    if (optimisticPrev === value) {
      await supabase.from("dream_votes").delete().eq("dream_id", dream.id).eq("user_id", u.id)
    } else {
      await supabase.from("dream_votes").upsert({ dream_id: dream.id, user_id: u.id, value })
    }
  }

  // 留言
  const postComment = async () => {
    const u = (await supabase.auth.getUser()).data.user
    if (!u) return alert("請先登入")
    if (!comment.trim()) return
    const body = comment.trim()
    setComment("")
    await supabase.from("dream_comments").insert({ dream_id: dream.id, user_id: u.id, body })
    loadComments()
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
          className={`rounded-lg px-3 py-1.5 text-sm border ${meVote === 1 ? "bg-emerald-600 text-white border-emerald-600" : "bg-white"}`}
        >
          支持（{up}）
        </button>
        <button
          onClick={() => vote(-1)}
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
          <button onClick={postComment} className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white">
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