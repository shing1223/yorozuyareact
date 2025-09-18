// app/api/debug/fb/route.ts
import { NextResponse } from 'next/server'
export async function GET() {
  const id = process.env.FB_APP_ID || null
  const secret = process.env.FB_APP_SECRET || null
  const redirect = process.env.IG_REDIRECT_URI || null
  return NextResponse.json({
    FB_APP_ID: id,
    FB_APP_SECRET_prefix: secret ? secret.slice(0, 6) : null,
    FB_APP_SECRET_length: secret?.length ?? 0,
    IG_REDIRECT_URI: redirect,
  })
}