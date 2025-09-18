// app/api/ig/auth/route.ts
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const u = new URL(req.url)
  const merchant = u.searchParams.get('merchant') ?? 'shop1'

  const IG_APP_ID = process.env.IG_APP_ID!
  const IG_REDIRECT_URI = process.env.IG_REDIRECT_URI!  // 例：https://yorozuyareact.vercel.app/api/ig/callback

  const state = `${crypto.randomUUID()}:${merchant}`
  const auth = new URL('https://www.instagram.com/oauth/authorize')
  auth.searchParams.set('client_id', IG_APP_ID)
  auth.searchParams.set('redirect_uri', IG_REDIRECT_URI)
  auth.searchParams.set('response_type', 'code')
  auth.searchParams.set('scope', 'instagram_business_basic')
  auth.searchParams.set('state', state)

  return NextResponse.redirect(auth.toString(), { status: 302 })
}