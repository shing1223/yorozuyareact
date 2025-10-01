// app/checkout/confirm/[code]/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

export const dynamic = "force-dynamic"

async function sbWithCode(code: string) {
  const jar = await cookies() // ✅ Next 15：同步 API，不能 await

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ 新版 createServerClient 的 cookies 介面
        getAll() {
          return jar.getAll()
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...(options as CookieOptions) })
          })
        },
      },
      // ✅ 透過 header 傳遞查詢碼，配合你的 RLS
      global: {
        headers: { "X-Order-Code": code },
      },
    }
  )
}

type Props = { params: { code: string } }

export default async function ConfirmPage({ params }: Props) {
  const supabase = await sbWithCode(params.code)

  // 1) 主檔（RLS 會用 X-Order-Code 放行）
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .single()

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="夢想" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">訂單確認</h2>
          <Link
            href="/"
            className="text-sm text-gray-600 underline hover:text-gray-800"
          >
            回到首頁
          </Link>
        </div>

        {!order || orderErr ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-700">
            <h3 className="text-lg font-semibold">找不到訂單</h3>
            <p className="mt-2 text-gray-600">
              請確認你的查詢碼是否正確：<b>{params.code}</b>
            </p>
            <Link href="/" className="mt-3 inline-block text-blue-600 underline">
              回首頁
            </Link>
          </div>
        ) : (
          <ConfirmBody supabaseWithCode={supabase} order={order} />
        )}
      </section>
    </main>
  )
}

/** 分離出內容主體（Server Component 子樹） */
async function ConfirmBody({
  supabaseWithCode,
  order,
}: {
  supabaseWithCode: ReturnType<typeof createServerClient>
  order: any
}) {
  // 2) 明細
  const { data: items } = await supabaseWithCode
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-lg font-semibold">訂單已建立</h3>
        <p className="mt-2 text-gray-600">
          你的查詢碼：<b>{order.order_code}</b>
        </p>
        <p className="mt-1 text-gray-600">
          目前為「線下支付」流程，我們已收到訂單，商家將與你聯絡確認與付款。
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border bg-white p-6">
        <h4 className="font-semibold">顧客 / 送貨資料</h4>
        <div className="text-sm text-gray-700">
          <div>姓名：{order.customer_name}</div>
          <div>Email：{order.customer_email}</div>
          <div>電話：{order.customer_phone}</div>
          <div>
            地址：
            {order.shipping_address?.country} {order.shipping_address?.city}{" "}
            {order.shipping_address?.address} {order.shipping_address?.postal_code}
          </div>
          {order.note && <div>備註：{order.note}</div>}
        </div>
      </section>

      <section className="space-y-3 rounded-2xl border bg-white p-6">
        <h4 className="font-semibold">訂單項目</h4>
        {!items?.length ? (
          <p className="text-gray-500">—</p>
        ) : (
          <div className="divide-y rounded border">
            {items.map((it: any) => (
              <div key={it.id} className="p-3 text-sm">
                <div className="font-medium">{it.title}</div>
                <div className="text-gray-500">@{it.merchant_slug}</div>
                <div>數量：{it.qty}</div>
                <div>
                  單價：{it.currency} {Number(it.price).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link href="/" className="text-blue-600 underline">
        回首頁
      </Link>
    </div>
  )
}