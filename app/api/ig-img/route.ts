// app/api/ig-img/route.ts
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
}

export function OPTIONS() {
  return new Response(null, { headers: CORS })
}

const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← 用 service role 才能更新
  { auth: { persistSession: false } }
)

async function fetchUpstream(u: string) {
  return fetch(u, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept":
        "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.7",
    },
    redirect: "follow",
  })
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("u")
    if (!raw) return new Response("Missing u", { status: 400, headers: CORS })
    const target = decodeURIComponent(raw) // ★ 統一解一次，避免雙重編碼

    // 先嘗試抓
    let resp = await fetchUpstream(target)

    // ===== 403 急救：avatar 即時刷新 =====
    if (resp.status === 403) {
      const kind = req.nextUrl.searchParams.get("kind") // "avatar" / "media" ...
      const slug = req.nextUrl.searchParams.get("slug") || undefined

      if (kind === "avatar" && slug) {
        // 1) 查 IG 帳號
        const { data: acc } = await sbAdmin
          .from("ig_account")
          .select("id, ig_user_id, access_token")
          .eq("merchant_slug", slug)
          .maybeSingle()

        if (acc?.ig_user_id && acc?.access_token) {
          // 2) 用 Graph API 取最新頭像（商業帳號可用）
          const g = new URL(`https://graph.instagram.com/${acc.ig_user_id}`)
          g.searchParams.set("fields", "profile_picture_url,username")
          g.searchParams.set("access_token", acc.access_token)

          const r = await fetch(g.toString())
          const j = await r.json().catch(() => null)

          const newUrl = j?.profile_picture_url as string | undefined
          if (r.ok && newUrl) {
            // 3) 寫回 DB（兩表保持一致）
            await sbAdmin.from("ig_account")
              .update({ profile_picture_url: newUrl })
              .eq("id", acc.id)
            await sbAdmin.from("merchants")
              .update({ avatar_url: newUrl })
              .eq("slug", slug)

            // 4) 改抓新網址
            resp = await fetchUpstream(newUrl)
          }
        }
      }
    }
    // ===== /403 急救 =====

    if (!resp.ok) {
      return new Response("upstream error", {
        status: resp.status,
        headers: CORS,
      })
    }

    // 回傳串流 + 快取
    const h = new Headers(CORS)
    h.set("content-type", resp.headers.get("content-type") ?? "image/jpeg")
    h.set("cache-control", "public, max-age=21600") // 6 小時
    h.set("referrer-policy", "no-referrer")
    return new Response(resp.body, { headers: h })
  } catch (e: any) {
    return new Response(`proxy error: ${e?.message || e}`, {
      status: 500,
      headers: CORS,
    })
  }
}