// app/(dashboard)/dashboard/orders/[id]/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({ params, searchParams }:{
  params: { id: string },
  searchParams?: { merchant?: string }
}) {
  const sb = await createSupabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) redirect(`/login?redirect=/dashboard/orders/${params.id}`)

  const merchant = (searchParams?.merchant ?? 'shop1')

  // 先抓訂單主檔（RLS 會檢查是否含你商戶的項目）
  const { data: order, error: oErr } = await sb
    .from('orders')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()

  if (oErr || !order) {
    return (
      <main className="p-6 space-y-2">
        <Link href="/dashboard/orders" className="text-blue-600 underline">← 返回訂單列表</Link>
        <div className="text-red-600">讀取訂單失敗或無權限。</div>
      </main>
    )
  }

  // 僅抓屬於該商戶的明細列（RLS 仍會再保護一次）
  const { data: items, error: iErr } = await sb
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)
    .eq('merchant_slug', merchant)

  if (iErr) {
    return (
      <main className="p-6 space-y-2">
        <Link href="/dashboard/orders" className="text-blue-600 underline">← 返回訂單列表</Link>
        <div className="text-red-600">讀取明細失敗：{iErr.message}</div>
      </main>
    )
  }

  const merchantTotals = (() => {
    const map = new Map<string, number>()
    for (const it of (items ?? [])) {
      const cur = (it.currency || 'HKD').toUpperCase()
      const line = Number(it.price ?? 0) * Number(it.qty ?? 1)
      map.set(cur, (map.get(cur) || 0) + line)
    }
    return Array.from(map.entries()) // [[HKD, 123], ...]
  })()

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/orders" className="text-blue-600 underline">← 返回訂單列表</Link>
        <div className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</div>
      </div>

      <h1 className="text-2xl font-semibold">訂單 {order.order_code}</h1>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <h2 className="font-medium">顧客資料</h2>
          <div>姓名：{order.customer_name}</div>
          <div>Email：{order.customer_email}</div>
          <div>電話：{order.customer_phone}</div>
        </div>

        <div className="space-y-2">
          <h2 className="font-medium">送貨資料</h2>
          <pre className="bg-gray-50 p-3 rounded text-sm">
            {JSON.stringify(order.shipping_address, null, 2)}
          </pre>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">你的商戶（{merchant}）明細</h2>
        {!items?.length ? (
          <div className="text-gray-500">此訂單沒有屬於你商戶的品項。</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.id} className="border rounded p-3">
                <div className="font-medium">{it.title}</div>
                <div className="text-sm text-gray-500">x {it.qty}</div>
                <div className="text-sm">
                  單價：{it.currency} {Number(it.price).toLocaleString()}
                </div>
                {it.permalink && (
                  <a className="text-sm text-blue-600 underline" href={it.permalink} target="_blank">
                    查看 Instagram 貼文
                  </a>
                )}
              </div>
            ))}

            <div className="border-t pt-3">
              <h3 className="font-medium">小計（依幣別）</h3>
              <div className="space-y-1">
                {merchantTotals.map(([cur, sum]) => (
                  <div key={cur} className="flex items-center justify-between">
                    <span>{cur}</span>
                    <span>{sum.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {order.note && (
        <section className="space-y-2">
          <h2 className="font-medium">顧客備註</h2>
          <div className="p-3 rounded bg-gray-50 whitespace-pre-wrap">{order.note}</div>
        </section>
      )}
    </main>
  )
}