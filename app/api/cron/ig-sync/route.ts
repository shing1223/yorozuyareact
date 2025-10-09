// app/api/cron/ig-sync/route.ts
import { NextResponse } from "next/server"

export const runtime = "edge" // ✅ 建議使用 Edge Runtime

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url)
  const token = url.searchParams.get("secret")

  // 安全檢查：防止外部濫用
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const edgeUrl = process.env.SUPABASE_EDGE_URL
  if (!edgeUrl) {
    return NextResponse.json({ error: "Missing SUPABASE_EDGE_URL" }, { status: 500 })
  }

  // 觸發 Supabase Edge Function：ig-sync-media
  const res = await fetch(`${edgeUrl}/ig-sync-media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })

  const data = await res.text()
  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    response: data,
  })
}