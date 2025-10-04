// supabase/functions/ig-sync-media/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// 你資料模型假設：
// - ig_account(id, merchant_slug, ig_user_id, access_token)
// - merchant_media(merchant_slug, ig_media_id, media_type, media_url, thumbnail_url, caption, permalink, timestamp)
//   （或你實際用來生成 v_public_feed 的來源表）

async function fetchAllMedia(acc: any) {
  // 取最新 N 筆；可疊代 paging（這裡示範抓 60 筆）
  const base = new URL(`https://graph.instagram.com/${acc.ig_user_id}/media`);
  base.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  base.searchParams.set("access_token", acc.access_token);
  base.searchParams.set("limit", "60");

  const resp = await fetch(base);
  const j = await resp.json();
  if (!resp.ok) throw new Error(j?.error?.message || `HTTP ${resp.status}`);
  return j?.data ?? [];
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const onlySlug = url.searchParams.get("slug") ?? undefined; // 可指定單一商戶
    const onlyMediaId = url.searchParams.get("ig_id") ?? undefined; // 可指定單一 media 急救

    // 1) 取所有有 token 的帳號（或指定 slug）
    const { data: accounts, error } = await sb
      .from("ig_account")
      .select("id, merchant_slug, ig_user_id, access_token")
      .not("access_token", "is", null)
      .maybeSingle(onlySlug ? false : undefined) // 保持 select 多筆
      .eq(onlySlug ? "merchant_slug" : "id", onlySlug ?? undefined);
    if (error) throw error;

    const list = Array.isArray(accounts) ? accounts : (accounts ? [accounts] : []);

    const upserts: any[] = [];

    for (const acc of list) {
      if (onlyMediaId) {
        // 急救單筆：/ig-sync-media?slug=xxx&ig_id=yyyy
        const detailU = new URL(`https://graph.instagram.com/${onlyMediaId}`);
        detailU.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
        detailU.searchParams.set("access_token", acc.access_token);
        const r = await fetch(detailU);
        const j = await r.json();
        if (r.ok && j?.id) upserts.push({ acc, m: j });
      } else {
        const items = await fetchAllMedia(acc);
        for (const m of items) upserts.push({ acc, m });
      }
    }

    // 2) upsert 到來源表（請替換成你實際表名）
    for (const { acc, m } of upserts) {
      await sb.from("merchant_media").upsert({
        merchant_slug: acc.merchant_slug,
        ig_media_id: m.id,
        media_type: m.media_type,
        media_url: m.media_url ?? null,
        thumbnail_url: m.thumbnail_url ?? null,
        caption: m.caption ?? null,
        permalink: m.permalink ?? null,
        timestamp: m.timestamp ?? null,
      }, { onConflict: "merchant_slug,ig_media_id" });
    }

    return new Response(JSON.stringify({ ok: true, upserts: upserts.length }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500 });
  }
});