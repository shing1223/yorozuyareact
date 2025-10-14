// app/checkout/success/page.tsx
import Link from "next/link"

export const dynamic = "force-dynamic"

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { order?: string; session_id?: string }
}) {
  const order = searchParams.order
  const sessionId = searchParams.session_id

  return (
    <main className="mx-auto max-w-lg py-12 text-center space-y-6">
      <h1 className="text-2xl font-bold text-green-600">付款成功 🎉</h1>
      <p>你的訂單編號：</p>
      <p className="font-mono text-lg">{order ?? "(未知)"}</p>

      <p className="text-gray-500 text-sm break-all">
        Stripe Session ID：{sessionId ?? "(無)"}
      </p>

      <p>感謝你的購買！我們已收到訂單並會盡快安排出貨。</p>

      <Link
        href="/"
        className="inline-block mt-4 px-5 py-3 bg-black text-white rounded hover:opacity-90"
      >
        回到首頁
      </Link>
    </main>
  )
}