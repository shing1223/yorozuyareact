// app/cart/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { readCart, updateQty, removeItem, clearCart } from '@/lib/cart-storage'
import type { CartItem } from '@/types/cart'

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(readCart().items)
  }, [])

  // 依幣別分組小計
  const totalsByCurrency = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of items) {
      const cur = (it.currency as string) || 'HKD' // 預設 HKD
      const price = typeof it.price === 'number' ? it.price : 0
      map.set(cur, (map.get(cur) || 0) + price * it.qty)
    }
    return Array.from(map.entries()).map(([currency, total]) => ({ currency, total }))
  }, [items])

  function onQtyChange(it: CartItem, v: number) {
    const next = updateQty(it.merchant_slug, it.ig_media_id, v).items
    setItems(next)
  }

  function onRemove(it: CartItem) {
    const next = removeItem(it.merchant_slug, it.ig_media_id).items
    setItems(next)
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">購物車</h1>

      {!items.length ? (
        <div className="space-y-4">
          <p className="text-gray-600">你的購物車目前是空的。</p>
          <Link href="/" className="text-blue-600 underline">回首頁逛逛</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：清單 */}
          <section className="lg:col-span-2 space-y-4">
            {items.map((it) => {
              const unitLabel =
                typeof it.price === 'number'
                  ? `${(it.currency ?? 'HKD')} ${it.price.toLocaleString()}`
                  : '—（尚未定價）'
              return (
                <div key={`${it.merchant_slug}_${it.ig_media_id}`} className="flex gap-4 border rounded-lg p-3">
                  {/* 圖片 */}
                  <div className="relative w-28 h-28 shrink-0 rounded overflow-hidden bg-gray-100">
                    <Image src={it.image} alt={it.title} fill className="object-cover" />
                  </div>

                  {/* 資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="truncate">
                        <h3 className="font-medium truncate">{it.title}</h3>
                        <div className="text-sm text-gray-500 truncate">@{it.merchant_slug}</div>
                      </div>
                      <button
                        className="text-sm text-gray-500 hover:text-red-600"
                        onClick={() => onRemove(it)}
                      >
                        移除
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <label className="text-sm text-gray-600">數量</label>
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={(e) => onQtyChange(it, Number(e.target.value || 1))}
                        className="w-20 rounded border px-2 py-1"
                      />
                    </div>

                    <div className="mt-2 text-sm text-gray-600">
                      單價：{unitLabel}
                    </div>

                    {it.permalink && (
                      <div className="mt-2">
                        <a href={it.permalink} target="_blank" className="text-sm text-blue-600 underline">
                          於 Instagram 開啟貼文
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="flex items-center justify-between">
              <Link href="/" className="text-blue-600 underline">← 繼續逛逛</Link>
              <button
                className="text-sm text-gray-500 hover:text-red-600"
                onClick={() => { clearCart(); setItems([]) }}
              >
                清空購物車
              </button>
            </div>
          </section>

          {/* 右側：結帳摘要（多幣別分列） */}
          <aside className="border rounded-lg p-4 h-fit space-y-3">
            <h2 className="text-lg font-semibold">訂單摘要</h2>

            {!totalsByCurrency.length ? (
              <div className="text-sm text-gray-500">—</div>
            ) : (
              <div className="space-y-1">
                {totalsByCurrency.map(({ currency, total }) => (
                  <div key={currency} className="flex items-center justify-between">
                    <span>小計（{currency}）</span>
                    <span>{currency} {total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500">
              * 金額依幣別分列。若要「單幣別結帳（HKD）」請在加入購物車時統一帶入 HKD 單價與幣別。
            </p>
            <button
              className="w-full px-4 py-3 rounded-lg bg-black text-white disabled:opacity-50"
              disabled={!items.length}
              onClick={() => alert('示意：導向結帳（尚未實作）')}
            >
              前往結帳
            </button>
          </aside>
        </div>
      )}
    </main>
  )
}