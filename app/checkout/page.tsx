'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'   // ⬅️ 新增
import { readCart, clearCart } from '@/lib/cart-storage'
import type { Cart, CartItem } from '@/types/cart'

export default function CheckoutPage() {
  const router = useRouter()                  // ⬅️ 新增
  const [cart, setCart] = useState<Cart>({ items: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setCart(readCart())
  }, [])

  const totals: Array<[string, number]> = useMemo(() => {
    const map = new Map<string, number>()
    for (const it of cart.items) {
      const cur = (it.currency || 'HKD').toUpperCase()
      const line = (typeof it.price === 'number' ? it.price : 0) * it.qty
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
      items: cart.items,
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

      // ✅ 清空購物車並導去 confirm 頁
      clearCart()
      setCart({ items: [] })
      router.replace(`/orders/${j.order_code}`)
    } catch (err: any) {
      alert(`提交失敗：${err?.message || err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">結帳</h1>

      {!cart.items.length ? (
        <div className="space-y-2">
          <p>購物車是空的。</p>
          <Link href="/" className="text-blue-600 underline">回首頁</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左：表單 */}
          <section className="lg:col-span-2 space-y-6">
            <form onSubmit={onSubmit} className="space-y-6">
              {/* …你的表單維持不變… */}
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-5 py-3 rounded bg-black text-white disabled:opacity-50"
              >
                {loading ? '送出中…' : '送出訂單'}
              </button>
            </form>
          </section>

          {/* 右：摘要（你的版本已 OK） */}
          <aside className="border rounded p-4 h-fit space-y-3">
            <h2 className="text-lg font-semibold">訂單項目</h2>
            <div className="space-y-3">
              {cart.items.map((it: CartItem) => (
                <div key={`${it.merchant_slug}_${it.ig_media_id}`} className="border rounded p-3 text-sm">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-gray-500">@{it.merchant_slug}</div>
                  <div>數量：{it.qty}</div>
                  <div>
                    單價：{it.currency ?? 'HKD'} {typeof it.price === 'number' ? it.price.toLocaleString() : '—'}
                  </div>
                </div>
              ))}
              {totals.map(([cur, sum]) => (
                <div key={cur} className="flex items-center justify-between">
                  <span>小計（{cur}）</span>
                  <span>{cur} {sum.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 text-sm text-gray-500">* 本訂單為線下支付；多商戶與多幣別已分列金額。</div>
          </aside>
        </div>
      )}
    </main>
  )
}