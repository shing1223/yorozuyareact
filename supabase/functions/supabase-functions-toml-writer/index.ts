// supabase/functions/supabase-functions-toml-writer/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (_req) => {
  const toml = `[functions.ig-refresh]
verify_jwt = false

# 每 12 小時跑一次
[schedules.ig_refresh_cron]
cron = "0 */12 * * *"
endpoint = "ig-refresh"

[functions.ig-sync-media]
verify_jwt = false

# 每 6 小時跑一次
[schedules.ig_sync_media_cron]
cron = "0 */6 * * *"
endpoint = "ig-sync-media"
`;

  return new Response(toml, {
    headers: {
      "content-type": "text/plain",
      "access-control-allow-origin": "*",   // ✅ 加上 CORS，前端也能直接存取
    },
  });
});