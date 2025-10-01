// app/checkout/CheckoutClient.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { readCart, clearCart } from "@/lib/cart-storage"
import type { Cart, CartItem } from "@/types/cart"

export default function CheckoutClient() {
  const [cart, setCart] = useState<Cart>({ items: [] })
  const [loading, setLoading] = useState(false)
  const [orderCode, setOrderCode] = useState<string | null>(null)

  useEffect(() => {
    setCart(readCart())
  }, [])

  // 依幣別分組小計
  const totals: Array<[string, number]> = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of cart.items) {
      const cur = (it.currency || "HKD").toUpperCase()
      const line = (typeof it.price === "number" ? it.price : 0) * it.qty
      map.set(cur, (map.get(cur) || 0) + line)
    }
    return Array.from(map.entries())
  }, [cart.items])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!cart.items.length || loading) return

    const fd = new FormData(e.currentTarget)
    const payload = {
      customer: {
        name: String(fd.get("name") || ""),
        email: String(fd.get("email") || ""),
        phone: String(fd.get("phone") || ""),
      },
      shipping: {
        country: String(fd.get("country") || ""),
        city: String(fd.get("city") || ""),
        address: String(fd.get("address") || ""),
        postal_code: String(fd.get("postal_code") || ""),
      },
      note: String(fd.get("note") || ""),
      items: cart.items,
    }

    setLoading(true)
    try {
      const r = await fetch("/api/checkout/offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.detail || r.statusText)

      setOrderCode(j.order_code)
      clearCart()
      setCart({ items: [] })
    } catch (err: any) {
      alert(`提交失敗：${err?.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  if (orderCode) {
    return (
      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm
                      border-gray-200 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">訂單已送出</h3>
        <p className="text-gray-700 dark:text-gray-300">我們已收到你的訂單，請留意商戶聯繫（線下支付）。</p>
        <p className="text-gray-900 dark:text-gray-100">
          你的訂單編號：<b>{orderCode}</b>
        </p>
        <p className="text-gray-900 dark:text-gray-100">
          請記下訂單編號/截圖。
        </p>
        <Link href="/" className="text-blue-600 underline dark:text-blue-400">
          回首頁
        </Link>
      </div>
    )
  }

  if (!cart.items.length) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm
                      border-gray-200 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-gray-700 dark:text-gray-300">購物車是空的。</p>
        <Link href="/" className="mt-2 inline-block text-blue-600 underline dark:text-blue-400">
          回首頁
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 左：表單 */}
      <section className="space-y-6 lg:col-span-2">
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">顧客資料</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                name="name"
                placeholder="姓名 *"
                required
                className="rounded border px-3 py-2
                           border-gray-300 text-gray-900
                           dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="email"
                placeholder="Email *"
                type="email"
                required
                className="rounded border px-3 py-2
                           border-gray-300 text-gray-900
                           dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="phone"
                placeholder="聯絡電話 *"
                required
                className="rounded border px-3 py-2 md:col-span-2
                           border-gray-300 text-gray-900
                           dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">送貨資料</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                name="country"
                placeholder="國家/地區 *"
                required
                className="rounded border px-3 py-2
                           border-gray-300 text-gray-900
                           dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="city"
                placeholder="城市 *"
                required
                className="rounded border px-3 py-2
                           border-gray-300 text-gray-900
                           dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="address"
                placeholder="地址 *"
                required
                className="rounded border px-3 py-2 md:col-span-2
                           border-gray-300 text-gray-900
                           dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="postal_code"
                placeholder="郵遞區號"
                className="rounded border px-3 py-2
                           border-gray-300 text-gray-900
                           dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">備註</h2>
            <textarea
              name="note"
              placeholder="有什麼想補充的…"
              rows={3}
              className="w-full rounded border px-3 py-2
                         border-gray-300 text-gray-900
                         dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
            />
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">付款方式</h2>
            <div className="rounded border bg-gray-50 p-3
                            border-gray-300 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-gray-900 dark:text-gray-100">線下支付（OFFLINE）</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                送出訂單後，由商戶與你聯繫並提供付款方式；完成付款後安排出貨。
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-black px-5 py-3 text-white disabled:opacity-50 md:w-auto
                       hover:opacity-95 active:scale-[0.99]
                       dark:bg-white dark:text-black"
          >
            {loading ? "送出中…" : "送出訂單"}
          </button>
        </form>
      </section>

      {/* 右：摘要 */}
      <aside className="h-fit space-y-3 rounded border p-4
                        border-gray-200 bg-white shadow-sm
                        dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">訂單項目</h2>

        <div className="space-y-3">
          {cart.items.map((it: CartItem) => (
            <div
              key={`${it.merchant_slug}_${it.ig_media_id}`}
              className="rounded border p-3 text-sm
                         border-gray-200 bg-white
                         dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="truncate font-medium text-gray-900 dark:text-gray-100">{it.title}</div>
              <div className="text-gray-500 dark:text-gray-400">@{it.merchant_slug}</div>
              <div className="text-gray-700 dark:text-gray-300">數量：{it.qty}</div>
              <div className="text-gray-700 dark:text-gray-300">
                單價：{it.currency ?? "HKD"}{" "}
                {typeof it.price === "number" ? it.price.toLocaleString() : "—"}
              </div>
            </div>
          ))}

          {totals.map(([cur, sum]) => (
            <div key={cur} className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">小計（{cur}）</span>
              <span className="text-gray-900 dark:text-gray-100">
                {cur} {sum.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
          * 本訂單為線下支付；多商戶與多幣別已分列金額。
        </div>
      </aside>
    </div>
  )
}