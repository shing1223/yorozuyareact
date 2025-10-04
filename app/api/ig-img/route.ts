// app/api/ig-img/route.ts
import type { NextRequest } from "next/server"

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
}

export async function OPTIONS() {
  return new Response(null, { headers: CORS })
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("u")
    if (!raw) return new Response("Missing u", { status: 400, headers: CORS })

    // ★ 把前端傳來的（可能被 encode 過的）網址統一解一次
    const target = decodeURIComponent(raw)

    // 轉抓（不帶 referer；補常見 Accept/User-Agent）
    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      // cf/next 也不會自動帶 referrer
      redirect: "follow",
    })

    // 可選：403 時觸發你的 Edge Function 急救（略）
    // if (upstream.status === 403) { ... }

    if (!upstream.ok) {
      return new Response("upstream error", {
        status: upstream.status,
        headers: CORS,
      })
    }

    // 回傳串流 + 快取
    const h = new Headers(CORS)
    h.set("content-type", upstream.headers.get("content-type") ?? "image/jpeg")
    h.set("cache-control", "public, max-age=21600") // 6 小時
    h.set("referrer-policy", "no-referrer")
    return new Response(upstream.body, { headers: h })
  } catch (e: any) {
    return new Response(`proxy error: ${e?.message || e}`, {
      status: 500,
      headers: CORS,
    })
  }
}