// supabase/functions/ig-refresh/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const MAX_CONCURRENCY = 5;
class Semaphore {
  private queue: Array<() => void> = [];
  private permits: number;
  constructor(n: number) { this.permits = n; }
  async acquire() { if (this.permits > 0) { this.permits--; return; }
    await new Promise<void>(r => this.queue.push(r)); }
  release() { this.permits++; const r = this.queue.shift(); r?.(); }
}

Deno.serve(async () => {
  try {
    const tenDays = new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString();

    const { data: rows, error } = await sb
      .from("ig_account")
      .select("id, merchant_slug, ig_user_id, access_token, token_expires_at")
      .or(`token_expires_at.is.null,token_expires_at.lte.${tenDays}`);
    if (error) throw error;

    const sem = new Semaphore(MAX_CONCURRENCY);
    const results: any[] = [];

    await Promise.all((rows ?? []).map(async (r) => {
      await sem.acquire();
      try {
        const u = new URL("https://graph.instagram.com/refresh_access_token");
        u.searchParams.set("grant_type", "ig_refresh_token");
        u.searchParams.set("access_token", r.access_token);

        const resp = await fetch(u, { method: "GET" });
        const j = await resp.json().catch(() => ({}));

        if (!resp.ok || !j?.access_token || !j?.expires_in) {
          // 標記需要重新連結
          await sb.from("ig_account").update({ token_expires_at: null }).eq("id", r.id);
          results.push({ id: r.id, ok: false, message: j?.error?.message || `HTTP ${resp.status}` });
          return;
        }

        const newExpiresAt = new Date(Date.now() + Number(j.expires_in) * 1000).toISOString();
        const { error: uerr } = await sb
          .from("ig_account")
          .update({ access_token: j.access_token, token_expires_at: newExpiresAt })
          .eq("id", r.id);
        if (uerr) throw uerr;

        results.push({ id: r.id, ok: true, message: "refreshed" });
      } catch (e: any) {
        results.push({ id: r.id, ok: false, message: e?.message || "error" });
      } finally {
        sem.release();
      }
    }));

    return new Response(JSON.stringify({ count: results.length, results }, null, 2), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500 });
  }
});