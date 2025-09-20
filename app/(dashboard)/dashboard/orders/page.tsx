// app/(dashboard)/dashboard/orders/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function OrdersListPage() {
  const sb = await createSupabaseServer()
  const { data: { session } } = await sb.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard/orders')

  // TODO: 之後從使用者可選商戶帶入
  const merchant = 'shop1'

  // 取到「包含我商戶項目」的訂單（靠 RLS 自動過濾）
  // 做法1：直接查 orders，再查每筆的我方小計（建議在 DB 建 view 做彙總更快）
  const { data: orders, error } = await sb
    .from('orders')
    .select(`
      id,
      order_code,
      created_at,
      customer_name,
      currency_totals
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return <div className="p-6 text-red-600">讀取訂單失敗：{error.message}</div>
  }

  if (!orders?.length) {
    return (
      <main className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">訂單列表</h1>
        <p className="text-gray-500">目前沒有包含你商戶商品的訂單。</p>
      </main>
    )
  }

  // 顯示列表（示意：用 currency_totals；或你可在 orders.merchant_totals 存每商戶小計）
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">訂單列表</h1>

      <div className="overflow-x-auto">
        <table className="min-w-[720px] w-full border">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-2 border">時間</th>
              <th className="p-2 border">訂單編號</th>
              <th className="p-2 border">顧客</th>
              <th className="p-2 border">總額（分幣別）</th>
              <th className="p-2 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const totals = o.currency_totals as Record<string, number> | null
              const totalLabel = totals
                ? Object.entries(totals)
                  .map(([cur, sum]) => `${cur} ${Number(sum).toLocaleString()}`)
                  .join(' / ')
                : '—'
              return (
                <tr key={o.id} className="align-top">
                  <td className="p-2 border">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="p-2 border">{o.order_code}</td>
                  <td className="p-2 border">{o.customer_name}</td>
                  <td className="p-2 border">{totalLabel}</td>
                  <td className="p-2 border">
                    <Link
                      href={`/dashboard/orders/${o.id}?merchant=${merchant}`}
                      className="text-blue-600 underline"
                    >
                      檢視
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}