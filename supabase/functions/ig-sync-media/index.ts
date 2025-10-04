// supabase/functions/ig-sync-media/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

// 取一個帳號或全部帳號
async function listAccounts(onlySlug?: string) {
  const q = sb
    .from("ig_account")
    .select("id, merchant_slug, ig_user_id, access_token")
    .not("access_token", "is", null);

  const { data, error } = onlySlug ? await q.eq("merchant_slug", onlySlug) : await q;
  if (error) throw error;
  return data ?? [];
}

async function fetchAllMedia(acc: any) {
  const u = new URL(`https://graph.instagram.com/${acc.ig_user_id}/media`);
  u.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  u.searchParams.set("access_token", acc.access_token);
  u.searchParams.set("limit", "60");

  const r = await fetch(u);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `HTTP ${r.status}`);
  return j?.data ?? [];
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const onlySlug = url.searchParams.get("slug") || undefined;
    const onlyMediaId = url.searchParams.get("ig_id") || undefined;

    const accounts = await listAccounts(onlySlug);
    const upserts: any[] = [];

    for (const acc of accounts) {
      if (onlyMediaId) {
        // 急救單筆
        const du = new URL(`https://graph.instagram.com/${onlyMediaId}`);
        du.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
        du.searchParams.set("access_token", acc.access_token);

        const r = await fetch(du);
        const j = await r.json();
        if (r.ok && j?.id) upserts.push({ acc, m: j });
      } else {
        const items = await fetchAllMedia(acc);
        for (const m of items) upserts.push({ acc, m });
      }
    }

    // ⚠️ 關鍵：把 acc.ig_user_id 寫入；onConflict 對應你的唯一鍵
    for (const { acc, m } of upserts) {
      await sb.from("ig_media").upsert(
        {
          ig_media_id: m.id,
          merchant_slug: acc.merchant_slug,
          ig_user_id: acc.ig_user_id,                  // ←← 必填（你表是 NOT NULL）
          media_type: m.media_type ?? null,
          media_url: m.media_url ?? null,
          thumbnail_url: m.thumbnail_url ?? null,
          caption: m.caption ?? null,
          permalink: m.permalink ?? null,
          timestamp: m.timestamp ?? null,
        },
        { onConflict: "merchant_slug,ig_media_id" }     // 建議用複合唯一索引
      );
    }

    return new Response(JSON.stringify({ ok: true, upserts: upserts.length }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500 });
  }
});