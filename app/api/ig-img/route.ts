// app/api/ig-img/route.ts
export const runtime = "edge" // 或 "nodejs"，用 edge 通常延遲更低

const ALLOW_HOSTS = [
  "scontent.cdninstagram.com",
  "scontent-iad3-1.cdninstagram.com",
  "scontent-iad3-2.cdninstagram.com",
  "instagram.c10r.facebook.com",
  // 你遇到的其他變體都可加進來
]

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const u = searchParams.get("u")
    if (!u) return new Response("missing url", { status: 400 })

    // 安全白名單：只允許 IG CDN
    const target = new URL(u)
    if (!ALLOW_HOSTS.some(h => target.hostname.endsWith(h))) {
      return new Response("forbidden host", { status: 403 })
    }

    // 向上游帶 Referer / UA（不少 403 是因為缺頭）
    const upstream = await fetch(target.toString(), {
      headers: {
        "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
        // 常見桌面 UA；避免使用 fetch 預設 UA
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        // 你也可以視需要轉發 Range（如果之後要支援影片切片）
        ...(req.headers.get("range") ? { Range: req.headers.get("range")! } : {}),
      },
      redirect: "follow",
      // 對 IG 圖片，通常不需要 revalidate；交給 CDN 快取
      cache: "no-store",
    })

    if (!upstream.ok) {
      // 把上游錯誤透傳回來，便於你在日誌看到真正的 code
      return new Response(await upstream.text(), { status: upstream.status })
    }

    // 從上游沿用 Content-Type / Content-Length（如有）
    const ct = upstream.headers.get("content-type") ?? "image/jpeg"
    const len = upstream.headers.get("content-length") ?? undefined
    const acceptRanges = upstream.headers.get("accept-ranges") ?? undefined
    const status = upstream.status // 206 for ranged response

    // CDN 快取：7 天 + SWR 1 天（可自行調整）
    const cacheCtl = "public, s-maxage=604800, stale-while-revalidate=86400"

    return new Response(upstream.body, {
      status,
      headers: {
        "Content-Type": ct,
        ...(len ? { "Content-Length": len } : {}),
        ...(acceptRanges ? { "Accept-Ranges": acceptRanges } : {}),
        "Cache-Control": cacheCtl,
      },
    })
  } catch (err) {
    return new Response("proxy error", { status: 500 })
  }
}