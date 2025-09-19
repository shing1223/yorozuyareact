// app/api/dashboard/toggle/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ✅ 這裡要 async，並且 await cookies()
async function sbFromCookies() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return jar.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          jar.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          jar.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}

export async function POST(req: Request) {
  // ✅ 這裡也記得 await
  const sb = await sbFromCookies()

  const form = await req.formData()
  const merchant = String(form.get('merchant') ?? '')
  const ig_media_id = String(form.get('ig_media_id') ?? '')

  if (!merchant || !ig_media_id) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  const { data: cur } = await sb
    .from('media_selection')
    .select('is_published')
    .eq('merchant_slug', merchant)
    .eq('ig_media_id', ig_media_id)
    .maybeSingle()

  const next = !(cur?.is_published ?? false)

  const { error } = await sb
    .from('media_selection')
    .upsert(
      {
        merchant_slug: merchant,
        ig_media_id,
        is_published: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'merchant_slug,ig_media_id' }
    )

  if (error) {
    return NextResponse.json({ error: 'toggle_failed', detail: error.message }, { status: 500 })
  }

  const url = new URL(req.url)
  return NextResponse.redirect(new URL(`/dashboard?merchant=${merchant}`, url.origin), { status: 302 })
}