// app/api/ig/callback/route.ts
import { NextResponse } from 'next/server'

function parseState(raw: string | null) {
  if (!raw) return { merchant: null }
  const [, merchant] = raw.split(':')
  return { merchant: merchant ?? null }
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')
  const { merchant } = parseState(stateRaw)

  if (!code) return NextResponse.json({ error: 'oauth_failed', detail: 'missing code' }, { status: 400 })
  if (!merchant) return NextResponse.json({ error: 'oauth_failed', detail: 'missing merchant in state' }, { status: 400 })

  const client_id = process.env.IG_APP_ID!
  const client_secret = process.env.IG_APP_SECRET!
  const redirect_uri = process.env.IG_REDIRECT_URI!

  // Step 2: code -> short-lived user token（Instagram Login 端點）
  const form = new URLSearchParams()
  form.set('client_id', client_id)
  form.set('client_secret', client_secret)
  form.set('grant_type', 'authorization_code')
  form.set('redirect_uri', redirect_uri)
  form.set('code', code)

  const r1 = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  const j1 = await r1.json().catch(() => ({} as any))
  if (!r1.ok || !j1.access_token) {
    return NextResponse.json(
      { error: 'oauth_failed', detail: `exchange code failed: ${j1.error_message || r1.statusText}`, raw: j1 },
      { status: 500 }
    )
  }
  const shortToken: string = j1.access_token
  const igUserId: string = String(j1.user_id)

  // Step 3: short -> long-lived（Graph Instagram 端點）
  const r2 = await fetch(
    `https://graph.instagram.com/access_token` +
      `?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(client_secret)}` +
      `&access_token=${encodeURIComponent(shortToken)}`
  )
  const j2 = await r2.json().catch(() => ({} as any))
  if (!r2.ok || !j2.access_token) {
    return NextResponse.json(
      { error: 'oauth_failed', detail: `exchange long-lived failed: ${j2.error?.message || r2.statusText}`, raw: j2 },
      { status: 500 }
    )
  }
  const longLivedToken: string = j2.access_token

  // 之後你就可以用 graph.instagram.com 拿資料，例如：
  // GET https://graph.instagram.com/{igUserId}?fields=id,username&access_token={longLivedToken}

  return NextResponse.redirect(new URL(`/dashboard?merchant=${merchant}&connected=1`, url.origin), { status: 302 })
}

export const dynamic = 'force-dynamic'