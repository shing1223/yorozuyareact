// app/api/ig/callback/route.ts
import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabase-ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// state: <uuid>:<merchant_slug>
function parseState(raw: string | null) {
  const [, merchant] = (raw ?? '').split(':')
  return { merchant: merchant ?? null }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  const debug = url.searchParams.get('debug') === '1'
  const { merchant } = parseState(stateRaw)

  if (!code)     return NextResponse.json({ error: 'oauth_failed', detail: 'missing code' }, { status: 400 })
  if (!merchant) return NextResponse.json({ error: 'oauth_failed', detail: 'missing merchant' }, { status: 400 })

  const IG_APP_ID = process.env.IG_APP_ID!
  const IG_APP_SECRET = process.env.IG_APP_SECRET!
  const IG_REDIRECT_URI = process.env.IG_REDIRECT_URI!

  // 1) code -> short-lived token
  const r1 = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: IG_APP_ID,
      client_secret: IG_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: IG_REDIRECT_URI,
      code,
    }),
  })
  const j1: any = await r1.json().catch(() => ({}))
  if (!r1.ok || !j1.access_token) {
    return NextResponse.json(
      { error: 'oauth_failed', detail: `code exchange failed: ${j1.error_message || r1.statusText}`, raw: j1 },
      { status: 500 }
    )
  }
  const shortToken: string = j1.access_token

  // 2) short -> long-lived
  const r2 = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(
      IG_APP_SECRET
    )}&access_token=${encodeURIComponent(shortToken)}`
  )
  const j2: any = await r2.json().catch(() => ({}))
  if (!r2.ok || !j2.access_token) {
    return NextResponse.json(
      { error: 'oauth_failed', detail: `ll token failed: ${j2.error?.message || r2.statusText}`, raw: j2 },
      { status: 500 }
    )
  }
  const longToken: string = j2.access_token
  const tokenExpiresAt =
    j2.expires_in ? new Date(Date.now() + Number(j2.expires_in) * 1000).toISOString() : null

  // 3) me（包含 profile_picture_url）
  const rMe = await fetch(
    `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(longToken)}`
  )
  const me: any = await rMe.json().catch(() => ({}))
  if (!rMe.ok || !me.id) {
    return NextResponse.json(
      { error: 'oauth_failed', detail: `fetch me failed: ${me.error?.message || rMe.statusText}`, raw: me },
      { status: 500 }
    )
  }

  // 4) 使用者 session + 會員預檢 + upsert ig_account
  const supabase = await getServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const login = new URL('/login', url.origin)
    login.searchParams.set('redirect', url.pathname + url.search)
    return NextResponse.redirect(login, { status: 302 })
  }

  const m = merchant.trim().toLowerCase()

  const { data: isMember, error: rpcErr } = await supabase.rpc('is_member_text', { p_merchant_id: m })
  if (rpcErr) return NextResponse.json({ error: 'precheck_failed', detail: rpcErr.message }, { status: 500 })
  if (!isMember) {
    return NextResponse.json({ error: 'forbidden', detail: `not a member of ${m}`, extra: { user_id: user.id } }, { status: 403 })
  }

  // 只 upsert 到 ig_account（包含 profile_picture_url），不更新 merchants
  const { error: upErr } = await supabase
    .from('ig_account')
    .upsert(
      {
        merchant_slug: m,
        ig_user_id: me.id,
        ig_username: me.username ?? null,
        profile_picture_url: me.profile_picture_url ?? null,
        access_token: longToken,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_slug' }
    )

  if (upErr) {
    return NextResponse.json({ error: 'db_upsert_failed', detail: upErr.message }, { status: 500 })
  }

  if (debug) {
    return NextResponse.json({
      ok: true,
      merchant: m,
      me,
      token_expires_at: tokenExpiresAt,
      ig_account_updated: true,
    })
  }

  return NextResponse.redirect(new URL(`/dashboard?merchant=${m}&connected=1`, url.origin), { status: 302 })
}