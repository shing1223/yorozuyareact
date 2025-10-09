// app/api/cron/ig-sync/route.ts
import { NextResponse } from "next/server"

export const runtime = "edge" // 建議 Edge，速度快

function isFromVercelCron(req: Request) {
  // Vercel 會加這個 header（值通常是 "1"）
  return req.headers.get("x-vercel-cron") !== null
}

export async function GET(req: Request) {
  // 允許兩種：1) 來自 Vercel Cron；2) 手動用 secret 測試
  const okByHeader = isFromVercelCron(req)
  const okBySecret = new URL(req.url).searchParams.get("secret") === process.env.CRON_SECRET

  if (!okByHeader && !okBySecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const edgeBase = process.env.SUPABASE_EDGE_URL // 例: https://hvih...supabase.co/functions/v1
  if (!edgeBase) {
    return NextResponse.json({ error: "Missing SUPABASE_EDGE_URL" }, { status: 500 })
  }

  // 觸發你的 Supabase Edge Function
  const resp = await fetch(`${edgeBase}/ig-sync-media`, { method: "POST" })
  const text = await resp.text()

  return NextResponse.json({ ok: resp.ok, status: resp.status, body: text })
}