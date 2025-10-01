// app/checkout/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import { Suspense } from "react"
import CheckoutClient from "./CheckoutClient"

export const dynamic = "force-dynamic"

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="首頁" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">結帳</h2>
          <Link
            href="/cart"
            className="text-sm text-gray-600 underline hover:text-gray-800"
          >
            回到購物車
          </Link>
        </div>

        <Suspense fallback={<div className="rounded-2xl border bg-white p-6 text-gray-500">載入中…</div>}>
          <CheckoutClient />
        </Suspense>
      </section>
    </main>
  )
}