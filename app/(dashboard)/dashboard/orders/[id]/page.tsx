import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function OrdersListPage() {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard/orders')

  // 你的商戶識別（之後可從 profile/membership 取）
  const merchant = 'shop1'

  // 取最近 50 筆（RLS 會自動只給你看「包含自己商戶品項」的訂單）
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_code, created_at, payment_method, payment_status, currency_totals')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-semibold">訂單列表</h1>
        <p className="text-red-600">載入失敗：{error.message}</p>
        <Link href="/dashboard" className="text-blue-600 underline">← 回後台首頁</Link>
      </main>
    )
  }

  // 把每筆訂單中，屬於當前商戶的項目抓出來（一次抓，避免 N+1）
  const orderIds = (orders ?? []).map(o => o.id)
  let itemsByOrder = new Map<string, any[]>()
  if (orderIds.length) {
    const { data: items } = await supabase
      .from('order_items')
      .select('id, order_id, title, qty, price, currency, merchant_slug')
      .in('order_id', orderIds)
      .eq('merchant_slug', merchant) // 只看自己的商戶
    itemsByOrder = new Map<string, any[]>(
      (items ?? []).reduce<[string, any[]][]>((acc, it) => {
        const key = it.order_id as string
        const arr = itemsByOrder.get(key) ?? []
        arr.push(it)
        itemsByOrder.set(key, arr)
        return acc
      }, [])
    )
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">訂單列表</h1>
        <Link href="/dashboard" className="text-blue-600 underline">← 回後台首頁</Link>
      </div>

      {!orders?.length ? (
        <div className="rounded border p-4 text-gray-600">
          目前沒有包含你商戶商品的訂單。
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const items = itemsByOrder.get(o.id) ?? []
            if (!items.length) return null // 沒有你的商戶品項就不顯示（雙保險）
            // 自家商戶的簡單小計（依幣別）
            const subtotals = items.reduce<Record<string, number>>((m, it) => {
              const cur = (it.currency || 'HKD').toUpperCase()
              const line = Number(it.price || 0) * Number(it.qty || 1)
              m[cur] = (m[cur] || 0) + line
              return m
            }, {})

            return (
              <div key={o.id} className="border rounded p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">
                      訂單編號：<span className="font-mono">{o.order_code}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      建立時間：{new Date(o.created_at).toLocaleString()}
                      <span className="mx-2">•</span>
                      付款：{o.payment_method} / {o.payment_status}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/orders/${o.id}`}
                      className="px-3 py-1 rounded border"
                    >
                      查看詳情
                    </Link>
                    <Link
                      href={`/checkout/confirm/${o.order_code}`}
                      className="px-3 py-1 rounded border"
                    >
                      前台查看
                    </Link>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-medium">你商戶的品項（{items.length}）</div>
                  <div className="mt-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.map((it) => (
                      <div key={it.id} className="text-sm rounded border p-2">
                        <div className="font-medium truncate">{it.title}</div>
                        <div className="text-gray-500">數量：{it.qty}</div>
                        <div>單價：{it.currency} {Number(it.price).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 text-sm text-gray-700">
                  <div className="font-medium">你商戶小計</div>
                  {Object.entries(subtotals).map(([cur, sum]) => (
                    <div key={cur} className="flex items-center justify-between">
                      <span>小計（{cur}）</span>
                      <span>{cur} {sum.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}