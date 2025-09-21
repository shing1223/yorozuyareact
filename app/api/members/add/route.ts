// app/api/members/add/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY! // << 在環境變數設定

async function userClient() {
  const jar = await cookies()
  return createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll() { return jar.getAll() },
      setAll(toSet) { toSet.forEach(({ name, value, options }) => jar.set({ name, value, ...options })) },
    },
  })
}

const adminDb = createClient(SUPABASE_URL, SERVICE) // DB + Auth Admin（繞過 RLS，僅在受控 API 使用）

export async function POST(req: Request) {
  try {
    const ct = req.headers.get('content-type') || ''
    let merchant = ''
    let email = ''
    let role = 'member'

    if (ct.includes('application/json')) {
      const j = await req.json()
      merchant = String(j.merchant || '').trim()
      email = String(j.email || '').trim().toLowerCase()
      role = String(j.role || 'member').trim()
    } else {
      const fd = await req.formData()
      merchant = String(fd.get('merchant') || '').trim()
      email = String(fd.get('email') || '').trim().toLowerCase()
      role = String(fd.get('role') || 'member').trim()
    }

    if (!merchant || !email) {
      return NextResponse.json({ error: 'bad_request', detail: 'missing merchant or email' }, { status: 400 })
    }

    const uc = await userClient()
    const { data: { user }, error: sErr } = await uc.auth.getUser()
    if (sErr || !user) {
      return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }

    // 檢查目前使用者是否為該商戶 owner/admin
    {
      const { data: me } = await adminDb
        .from('membership')
        .select('role')
        .eq('user_id', user.id)
        .eq('merchant_id', merchant)
        .maybeSingle()

      if (!me || !['owner', 'admin'].includes(String(me.role))) {
        return NextResponse.json({ error: 'forbidden', detail: 'not allowed' }, { status: 403 })
      }
    }

    // 以 Email 查找使用者（Auth Admin API）
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      headers: {
        apikey: SERVICE,
        Authorization: `Bearer ${SERVICE}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const txt = await res.text()
      return NextResponse.json({ error: 'admin_lookup_failed', detail: txt }, { status: 500 })
    }

    const users = await res.json() as { users?: Array<{ id: string; email: string }> }
    const target = Array.isArray(users?.users) ? users.users.find(u => u.email?.toLowerCase() === email) : undefined
    if (!target) {
      // 你也可以在這裡觸發邀請流程（如有自建）
      return NextResponse.json({ error: 'user_not_found', detail: 'No user with this email' }, { status: 404 })
    }

    // 寫入 membership（upsert）
    const { error: upErr } = await adminDb
      .from('membership')
      .upsert({ user_id: target.id, merchant_id: merchant, role }, { onConflict: 'user_id,merchant_id' })

    if (upErr) {
      return NextResponse.json({ error: 'upsert_failed', detail: upErr.message }, { status: 500 })
    }

    // 支援從表單回跳
    const redirectUrl = new URL('/dashboard/members', req.url)
    redirectUrl.searchParams.set('ok', encodeURIComponent(email))
    return NextResponse.redirect(redirectUrl, { status: 303 })
  } catch (e: any) {
    // 若是直接呼叫 JSON，可回 JSON
    const msg = String(e?.message || e)
    // 嘗試優先表單回跳
    try {
      const url = new URL('/dashboard/members', req.url)
      url.searchParams.set('error', encodeURIComponent(msg))
      return NextResponse.redirect(url, { status: 303 })
    } catch {
      return NextResponse.json({ error: 'server_error', detail: msg }, { status: 500 })
    }
  }
}