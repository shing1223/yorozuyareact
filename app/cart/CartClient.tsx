// app/cart/CartClient.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { readCart, updateQty, removeItem, clearCart } from "@/lib/cart-storage"
import type { CartItem } from "@/types/cart"

const symbol = (cur?: string) =>
  cur === "HKD" ? "HK$" : cur === "TWD" ? "NT$" : cur ?? ""

export default function CartClient() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(readCart().items)
  }, [])

  // 依幣別分組小計
  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of items) {
      const cur = (it.currency as string) || "HKD"
      const price = typeof it.price === "number" ? it.price : 0
      map.set(cur, (map.get(cur) || 0) + price * it.qty)
    }
    return Array.from(map.entries()).map(([currency, total]) => ({ currency, total }))
  }, [items])

  function onQtyChange(it: CartItem, v: number) {
    const next = updateQty(it.merchant_slug, it.ig_media_id, Math.max(1, v)).items
    setItems(next)
  }

  function onRemove(it: CartItem) {
    const next = removeItem(it.merchant_slug, it.ig_media_id).items
    setItems(next)
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm
                      border-gray-200 dark:border-neutral-800 dark:bg-neutral-900">
        <p className="text-gray-600 dark:text-gray-300">你的購物車目前是空的。</p>
        <Link
          href="/"
          className="mt-3 inline-block text-blue-600 underline dark:text-blue-400"
        >
          回首頁逛逛
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* 左側：清單 */}
      <section className="space-y-4 lg:col-span-2">
        {items.map((it) => {
          const unitLabel =
            typeof it.price === "number"
              ? `${symbol(it.currency)} ${it.price.toLocaleString()}`
              : "—（尚未定價）"
          const hasImg = typeof it.image === "string" && it.image.trim().length > 0

          return (
            <div
              key={`${it.merchant_slug}_${it.ig_media_id}`}
              className="flex gap-4 rounded-lg border p-3
                         border-gray-200 bg-white shadow-sm
                         dark:border-neutral-800 dark:bg-neutral-900"
            >
              {/* 圖片（避免空字串 src） */}
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded bg-gray-100 dark:bg-neutral-800">
                {hasImg ? (
                  <Image src={it.image} alt={it.title || "商品圖片"} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                    無圖片
                  </div>
                )}
              </div>

              {/* 資訊 */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="truncate">
                    <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">
                      {it.title}
                    </h3>
                    <div className="truncate text-sm text-gray-500 dark:text-gray-400">
                      @{it.merchant_slug}
                    </div>
                  </div>
                  <button
                    className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    onClick={() => onRemove(it)}
                  >
                    移除
                  </button>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <label className="text-sm text-gray-600 dark:text-gray-300">數量</label>
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => onQtyChange(it, Number(e.target.value || 1))}
                    className="w-20 rounded border px-2 py-1
                               border-gray-300 text-gray-900
                               dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
                  />
                </div>

                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  單價：{unitLabel}
                </div>

                {it.permalink && (
                  <div className="mt-2">
                    <a
                      href={it.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 underline dark:text-blue-400"
                    >
                      於 Instagram 開啟貼文
                    </a>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        <div className="flex items-center justify-between">
          <Link href="/" className="text-blue-600 underline dark:text-blue-400">
            ← 繼續逛逛
          </Link>
          <button
            className="text-sm text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            onClick={() => {
              clearCart()
              setItems([])
            }}
          >
            清空購物車
          </button>
        </div>
      </section>

      {/* 右側：結帳摘要（多幣別分列） */}
      <aside className="h-fit space-y-3 rounded-lg border p-4
                        border-gray-200 bg-white shadow-sm
                        dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">訂單摘要</h2>

        {!totalsByCurrency.length ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">—</div>
        ) : (
          <div className="space-y-1">
            {totalsByCurrency.map(({ currency, total }) => (
              <div key={currency} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">小計（{currency}）</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {symbol(currency)} {total.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 dark:text-gray-400">
          * 金額依幣別分列。若要「單幣別結帳（HKD）」請在加入購物車時統一帶入 HKD 單價與幣別。
        </p>
        <Link
          href="/checkout"
          className="block w-full rounded-lg bg-black px-4 py-3 text-center text-white
                     hover:opacity-95 active:scale-[0.99]
                     dark:bg-white dark:text-black"
        >
          前往結帳
        </Link>
      </aside>
    </div>
  )
}