import { redirect } from 'next/navigation'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function OrdersPage() {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard/orders')

  // RLS 會自動只回「含有我商戶品項」的訂單
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_code, customer_name, customer_email, customer_phone, created_at, currency_totals, merchant_totals, order_items(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return <main className="p-6">讀取失敗：{error.message}</main>
  }

  if (!orders?.length) {
    return <main className="p-6">目前沒有包含你商戶商品的訂單。</main>
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">訂單列表</h1>
      <div className="space-y-4">
        {orders.map(o => {
          const myItems = (o.order_items ?? []).filter((it:any) => !!it) // RLS 已經過濾到只看得到自己的明細
          return (
            <div key={o.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">訂單編號：{o.order_code}</div>
                  <div className="text-sm text-gray-600">{new Date(o.created_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="text-sm">
                客戶：{o.customer_name}（{o.customer_email} / {o.customer_phone}）
              </div>

              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                {myItems.map((it:any) => (
                  <div key={it.id} className="border rounded p-3 text-sm">
                    <div className="font-medium truncate">{it.title}</div>
                    <div className="text-gray-500">@{it.merchant_slug}</div>
                    <div>數量：{it.qty}</div>
                    <div>單價：{it.currency} {Number(it.price).toLocaleString()}</div>
                    {it.permalink && (
                      <a href={it.permalink} target="_blank" className="text-blue-600 underline">IG 貼文</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}