// app/api/ig/auth/route.ts
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const u = new URL(req.url)
  const merchant = u.searchParams.get('merchant') ?? 'shop1'  // 自行帶店家 id
  const client_id = process.env.IG_APP_ID!
  const redirect_uri = process.env.IG_REDIRECT_URI!
  const state = `${crypto.randomUUID()}:${merchant}`

  // Instagram API with Instagram Login 的授權端點
  const auth = new URL('https://www.instagram.com/oauth/authorize')
  auth.searchParams.set('client_id', client_id)
  auth.searchParams.set('redirect_uri', redirect_uri)  // 必須和 Dashboard 逐字相同
  auth.searchParams.set('response_type', 'code')
  // 最小範圍就用 instagram_business_basic，之後再加其他 scope
  auth.searchParams.set('scope', 'instagram_business_basic')
  auth.searchParams.set('state', state)

  return NextResponse.redirect(auth.toString(), { status: 302 })
}