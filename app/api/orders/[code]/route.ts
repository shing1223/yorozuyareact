// app/api/orders/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> }   // ← Next 15：params 是 Promise
) {
  const { code } = await context.params             // ← 記得 await

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        // 把查詢碼放到 Header，讓 RLS policy 可讀取
        headers: { 'X-Order-Code': code },
      },
    }
  )

  // 讀訂單 + 明細（RLS 會用 header 放行）
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json(data)
}