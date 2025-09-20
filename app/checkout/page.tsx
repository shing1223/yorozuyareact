// app/checkout/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { readCart, clearCart } from '@/lib/cart-storage'
import type { CartItem } from '@/types/cart'
import Link from 'next/link'

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)
  const [orderCode, setOrderCode] = useState<string | null>(null)

  useEffect(() => {
    setItems(readCart().items)
  }, [])

  const totals = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of items) {
      const cur = (it.currency || 'HKD').toUpperCase()
      const line = (typeof it.price === 'number' ? it.price : 0) * it.qty
      map.set(cur, (map.get(cur) || 0) + line)
    }
    return Array.from(map.entries()) // [ [currency, total], ... ]
  }, [items])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!items.length || loading) return
    const fd = new FormData(e.currentTarget)
    const payload = {
      customer: {
        name: String(fd.get('name') || ''),
        email: String(fd.get('email') || ''),
        phone: String(fd.get('phone') || ''),
      },
      shipping: {
        country: String(fd.get('country') || ''),
        city: String(fd.get('city') || ''),
        address: String(fd.get('address') || ''),
        postal_code: String(fd.get('postal_code') || ''),
      },
      note: String(fd.get('note') || ''),
      items,
    }

    setLoading(true)
    try {
      const r = await fetch('/api/checkout/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.detail || r.statusText)
      setOrderCode(j.order_code)
      clearCart()
      setItems([])
    } catch (err: any) {
      alert(`提交失敗：${err.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  if (orderCode) {
    return (
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-3xl font-bold">訂單已送出</h1>
        <p>我們已收到你的訂單，請留意商戶聯繫（線下支付）。</p>
        <p>你的訂單編號：<b>{orderCode}</b></p>
        <Link href="/" className="text-blue-600 underline">回首頁</Link>
      </main>
    )
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">結帳</h1>

      {!items.length ? (
        <div className="space-y-2">
          <p>購物車是空的。</p>
          <Link href="/" className="text-blue-600 underline">回首頁</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左：表單 */}
          <section className="lg:col-span-2 space-y-6">
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">顧客資料</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input name="name" placeholder="姓名 *" required className="border rounded px-3 py-2" />
                  <input name="email" placeholder="Email *" type="email" required className="border rounded px-3 py-2" />
                  <input name="phone" placeholder="聯絡電話 *" required className="border rounded px-3 py-2 md:col-span-2" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">送貨資料</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input name="country" placeholder="國家/地區 *" required className="border rounded px-3 py-2" />
                  <input name="city" placeholder="城市 *" required className="border rounded px-3 py-2" />
                  <input name="address" placeholder="地址 *" required className="border rounded px-3 py-2 md:col-span-2" />
                  <input name="postal_code" placeholder="郵遞區號" className="border rounded px-3 py-2" />
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">備註</h2>
                <textarea name="note" placeholder="有什麼想補充的…" rows={3} className="w-full border rounded px-3 py-2" />
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">付款方式</h2>
                <div className="p-3 border rounded bg-gray-50">
                  <p>線下支付（OFFLINE）</p>
                  <p className="text-sm text-gray-500">送出訂單後，由商戶與你聯繫並提供付款方式；完成付款後安排出貨。</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-5 py-3 rounded bg-black text-white disabled:opacity-50"
              >
                {loading ? '送出中…' : '送出訂單'}
              </button>
            </form>
          </section>

          {/* 右：摘要 */}
          <aside className="border rounded p-4 h-fit space-y-3">
            <h2 className="text-lg font-semibold">訂單摘要</h2>
            <div className="space-y-1">
              {totals.map(([cur, sum]) => (
                <div key={cur} className="flex items-center justify-between">
                  <span>小計（{cur}）</span>
                  <span>{cur} {sum.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 text-sm text-gray-500">
              * 本訂單為線下支付；多商戶與多幣別已分列金額。
            </div>
          </aside>
        </div>
      )}
    </main>
  )
}