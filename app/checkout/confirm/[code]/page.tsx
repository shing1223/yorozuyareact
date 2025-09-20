// app/checkout/confirm/[code]/page.tsx
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

async function sbWithCode(code: string) {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // ✅ Next 15：用 getAll / setAll
      cookies: {
        getAll() {
          return jar.getAll()
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            jar.set({ name, value, ...options })
          )
        },
      },
      // ✅ 在 global.headers 帶入查詢碼，符合你的 RLS Policy
      global: {
        headers: { 'X-Order-Code': code },
      },
    }
  )
}

export default async function ConfirmPage({ params }: { params: { code: string } }) {
  const supabase = await sbWithCode(params.code)

  // 先拿主檔（RLS 會用 X-Order-Code 放行）
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .single()

  if (orderErr || !order) {
    return (
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold">找不到訂單</h1>
        <p className="text-gray-600">請確認你的查詢碼是否正確：{params.code}</p>
        <Link href="/" className="text-blue-600 underline">回首頁</Link>
      </main>
    )
  }

  // 再拿明細（可加上 order_id 過濾，更精準）
  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">訂單已建立</h1>
      <p className="text-gray-600">
        你的查詢碼：<b>{order.order_code}</b>
      </p>
      <p className="text-gray-600">
        目前為「線下支付」流程，我們已收到訂單，商家將與你聯絡確認與付款。
      </p>

      <section className="space-y-2">
        <h2 className="font-semibold">顧客 / 送貨資料</h2>
        <div className="text-sm text-gray-700">
          <div>姓名：{order.customer_name}</div>
          <div>Email：{order.customer_email}</div>
          <div>電話：{order.customer_phone}</div>
          <div>
            地址：
            {order.shipping_address?.country} {order.shipping_address?.city}{' '}
            {order.shipping_address?.address} {order.shipping_address?.postal_code}
          </div>
          {order.note && <div>備註：{order.note}</div>}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">訂單項目</h2>
        {!items?.length ? (
          <p className="text-gray-500">—</p>
        ) : (
          <div className="divide-y border rounded">
            {items.map((it: any) => (
              <div key={it.id} className="p-3 text-sm">
                <div className="font-medium">{it.title}</div>
                <div className="text-gray-500">@{it.merchant_slug}</div>
                <div>數量：{it.qty}</div>
                <div>單價：{it.currency} {Number(it.price).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link href="/" className="text-blue-600 underline">回首頁</Link>
    </main>
  )
}