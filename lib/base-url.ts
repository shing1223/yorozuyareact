// lib/base-url.ts
import { headers } from 'next/headers'

export async function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  const h = await headers() // 👈 注意要 await
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'http'
  if (host) return `${proto}://${host}`

  return 'http://localhost:3000'
}