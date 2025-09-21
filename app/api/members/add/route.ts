// app/api/merchants/create/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY // server only!

if (!SERVICE) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
}

async function userClient() {
  // 使用者 client：拿登入者身分
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options })
          })
        },
      },
    }
)
}

const adminDb = createClient(URL, SERVICE) // Service Role

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || ''
    let slug = ''
    let name = ''

    if (ct.includes('application/json')) {
      const j = await req.json()
      slug = String(j.slug || '').trim()
      name = String(j.name || '').trim()
    } else {
      const fd = await req.formData()
      slug = String(fd.get('slug') || '').trim()
      name = String(fd.get('name') || '').trim()
    }

    if (!slug || !name) {
      return NextResponse.json({ error: 'bad_request', detail: 'missing slug or name' }, { status: 400 })
    }

    // 取當前登入者
    const uc = await userClient()
    const { data: { user } } = await uc.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    // 1) 建立 merchants（用 Service Role，避免 RLS）
    {
      const { error } = await adminDb.from('merchants').insert([{ slug, name, is_public: true }])
      if (error) return NextResponse.json({ error: 'create_merchant_failed', detail: error.message }, { status: 500 })
    }

    // 2) 把呼叫者加到 membership 當 owner（upsert）
    {
      const { error } = await adminDb
        .from('membership')
        .upsert([{ user_id: user.id, merchant_id: slug, role: 'owner' }], { onConflict: 'user_id,merchant_id' })
      if (error) return NextResponse.json({ error: 'add_member_failed', detail: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, slug })
  } catch (e: any) {
    return NextResponse.json({ error: 'server_error', detail: String(e?.message || e) }, { status: 500 })
  }
}