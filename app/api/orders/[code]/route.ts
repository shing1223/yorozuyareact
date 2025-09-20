// app/api/orders/[code]/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // ✅ 把 X-Order-Code 放到全域 headers，配合你的 RLS policy
      global: {
        headers: { 'X-Order-Code': params.code },
      },
    }
  )

  // ✅ 再加上顯式過濾，避免拿到不相干的訂單
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_code', params.code)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json(data)
}