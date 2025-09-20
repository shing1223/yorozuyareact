// app/(dashboard)/dashboard/orders/page.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

async function sbWithCode(code?: string) {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll() },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => jar.set({ name, value, ...options }))
        },
      },
      ...(code ? { global: { headers: { 'X-Order-Code': code } } } : {}),
    }
  )
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: { code?: string }
}) {
  const code = (searchParams?.code || '').trim()

  // 需要登入
  const supabaseBase = await sbWithCode()
  const { data: { session } } = await supabaseBase.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard/orders')

  // 沒有 code -> 顯示查詢表單
  if (!code) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">訂單查詢</h1>
          <Link href="/dashboard" className="text-blue-600 underline">← 回後台</Link>
        </div>

        <form method="get" className="flex gap-2 items-center">
          <input
            name="code"
            placeholder="輸入訂單編號，例如：3ZZQ4E"
            className="flex-1 border rounded px-3 py-2"
            required
          />
          <button className="px-4 py-2 rounded bg-black text-white">查詢</button>
        </form>

        <p className="text-sm text-gray-500">
          目前 RLS 僅允許以訂單編號查單；若要列表檢視，需另外為商戶成員開啟相應的 SELECT Policy。
        </p>
      </main>
    )
  }

  // 有 code -> 帶 header 查單
  const supabase = await sbWithCode(code)

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*')
    .single()

  if (orderErr || !order) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">找不到訂單</h1>
          <Link href="/dashboard/orders" className="text-blue-600 underline">重新查詢</Link>
        </div>
        <p className="text-gray-600">請確認訂單編號是否正確：<b>{code}</b></p>
        <div className="text-sm text-gray-500">
          也可前往前台查詢頁：
          <Link href={`/checkout/confirm/${code}`} className="text-blue-600 underline ml-1">
            /checkout/confirm/{code}
          </Link>
        </div>
      </main>
    )
  }

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', order.id)

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">訂單詳情</h1>
        <Link href="/dashboard/orders" className="text-blue-600 underline">← 重新查詢</Link>
      </div>

      <div className="space-y-1">
        <div>訂單編號：<b>{order.order_code}</b></div>
        <div>建立時間：{new Date(order.created_at).toLocaleString()}</div>
        <div>付款方式：{order.payment_method}</div>
        <div>付款狀態：{order.payment_status}</div>
      </div>

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

      <section className="space-y-2">
        <h2 className="text-lg font-medium">訂單項目</h2>
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

      <section className="space-y-2">
        <h2 className="text-lg font-medium">金額小計</h2>
        {/* currency_totals 為 jsonb，例如 {"HKD": 1234, "TWD": 500} */}
        {order.currency_totals ? (
          <div className="space-y-1">
            {Object.entries(order.currency_totals as Record<string, number>).map(([cur, sum]) => (
              <div key={cur} className="flex items-center justify-between">
                <span>小計（{cur}）</span>
                <span>{cur} {Number(sum).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">—</p>
        )}
      </section>

      <div className="flex items-center gap-3">
        <Link
          href={`/checkout/confirm/${order.order_code}`}
          className="px-4 py-2 rounded border"
        >
          前台查看
        </Link>
        <Link href="/dashboard" className="text-blue-600 underline">
          回後台首頁
        </Link>
      </div>
    </main>
  )
}