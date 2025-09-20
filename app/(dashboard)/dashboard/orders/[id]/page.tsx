// app/(dashboard)/dashboard/orders/[id]/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect(`/login?redirect=/dashboard/orders/${params.id}`)

  // TODO: 從使用者 Membership 取得實際商戶；此處先沿用示範值
  const merchant = 'shop1'

  // 讀取訂單主檔（RLS 應允許「包含自己商戶品項」的訂單）
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (orderErr || !order) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">訂單不存在</h1>
          <Link href="/dashboard/orders" className="text-blue-600 underline">← 返回列表</Link>
        </div>
        <p className="text-gray-600">無法存取此訂單或訂單已不存在。</p>
      </main>
    )
  }

  // 只抓屬於當前商戶的品項
  const { data: items, error: itemsErr } = await supabase
    .from('order_items')
    .select('id, order_id, merchant_slug, title, qty, price, currency')
    .eq('order_id', order.id)
    .eq('merchant_slug', merchant)

  // 商戶小計（依幣別）
  const subtotals = (items ?? []).reduce<Record<string, number>>((m, it) => {
    const cur = (it.currency || 'HKD').toUpperCase()
    const line = Number(it.price || 0) * Number(it.qty || 1)
    m[cur] = (m[cur] || 0) + line
    return m
  }, {})

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">訂單詳情</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/orders" className="px-3 py-1 rounded border">← 返回列表</Link>
          <Link href={`/checkout/confirm/${order.order_code}`} className="px-3 py-1 rounded border">
            前台查看
          </Link>
        </div>
      </div>

      {/* 基本資訊 */}
      <section className="space-y-1">
        <div>訂單編號：<b className="font-mono">{order.order_code}</b></div>
        <div>建立時間：{new Date(order.created_at).toLocaleString()}</div>
        <div>付款方式：{order.payment_method}</div>
        <div>付款狀態：{order.payment_status}</div>
      </section>

      {/* 顧客/送貨資料 */}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">顧客 / 送貨資料</h2>
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

      {/* 你的商戶品項 */}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">你商戶的品項（{items?.length ?? 0}）</h2>
        {itemsErr ? (
          <p className="text-red-600 text-sm">載入品項失敗：{itemsErr.message}</p>
        ) : !items?.length ? (
          <p className="text-gray-500">此訂單沒有屬於你商戶的品項。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.map((it) => (
              <div key={it.id} className="rounded border p-3 text-sm">
                <div className="font-medium truncate">{it.title}</div>
                <div className="text-gray-500">數量：{it.qty}</div>
                <div>單價：{it.currency} {Number(it.price).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 商戶小計 */}
      <section className="space-y-2">
        <h2 className="text-lg font-medium">你商戶小計</h2>
        {!Object.keys(subtotals).length ? (
          <p className="text-gray-500">—</p>
        ) : (
          <div className="space-y-1">
            {Object.entries(subtotals).map(([cur, sum]) => (
              <div key={cur} className="flex items-center justify-between">
                <span>小計（{cur}）</span>
                <span>{cur} {sum.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}