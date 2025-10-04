// app/api/ig-img/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge"; // 用 Next Edge Runtime（非必要，但延遲更低）

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("u");
    if (!target) {
      return new NextResponse("Missing u", { status: 400, headers: CORS_HEADERS });
    }

    // 1) 先抓上游（帶基本 UA；Edge 環境本身不會帶 referrer）
    let resp = await fetch(target, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0" },
      referrerPolicy: "no-referrer",
      cache: "reload",
    });

    // 2) 若 403，可選擇觸發你部署的 Supabase Edge Function 去「急救重抓 media URL」
    if (resp.status === 403) {
      const slug = url.searchParams.get("slug") || undefined;
      const ig_id = url.searchParams.get("ig_id") || undefined;

      if (slug && ig_id && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const syncUrl = new URL(
          `/functions/v1/ig-sync-media?slug=${encodeURIComponent(slug)}&ig_id=${encodeURIComponent(ig_id)}`,
          process.env.NEXT_PUBLIC_SUPABASE_URL
        ).toString();

        // 你的 ig-sync-media 設了 verify_jwt=false 的話可以直接打
        // 如需授權，加上 Authorization header
        await fetch(syncUrl, { method: "GET" });

        // 重試一次原圖
        resp = await fetch(target, {
          headers: { "User-Agent": "Mozilla/5.0" },
          referrerPolicy: "no-referrer",
          cache: "reload",
        });
      }
    }

    if (!resp.ok) {
      return new NextResponse("upstream error", {
        status: resp.status,
        headers: CORS_HEADERS,
      });
    }

    const buf = await resp.arrayBuffer();
    const headers = new Headers(CORS_HEADERS);
    headers.set("content-type", resp.headers.get("content-type") ?? "image/jpeg");
    headers.set("cache-control", "public, max-age=21600"); // 6 小時
    headers.set("referrer-policy", "no-referrer");

    return new NextResponse(buf, { headers });
  } catch (e: any) {
    return new NextResponse(`proxy error: ${e?.message || String(e)}`, {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}