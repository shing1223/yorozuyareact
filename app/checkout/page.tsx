// app/checkout/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type CartItem = {
  merchant_slug: string
  ig_media_id: string
  title: string
  image: string
  permalink?: string
  caption?: string
  price?: number
  currency?: string
  qty: number
}
type Cart = { items: CartItem[] }

export default function CheckoutPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart>({ items: [] })
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cart_v1') || localStorage.getItem('cart')
      setCart(raw ? JSON.parse(raw) : { items: [] })
    } catch {
      setCart({ items: [] })
    }
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErr(null)

    if (!cart.items.length) {
      setErr('購物車是空的')
      return
    }

    const fd = new FormData(e.currentTarget)
    const payload = {
      customer_name: String(fd.get('name') || ''),
      customer_email: String(fd.get('email') || ''),
      customer_phone: String(fd.get('phone') || ''),
      shipping_address: {
        country: String(fd.get('country') || ''),
        city: String(fd.get('city') || ''),
        address: String(fd.get('address') || ''),
        postal_code: String(fd.get('postal') || ''),
      },
      note: String(fd.get('note') || ''),
      items: cart.items,
    }

    if (!payload.customer_name || !payload.customer_email || !payload.customer_phone) {
      setErr('請完整填寫姓名／Email／電話')
      return
    }

    setLoading(true)
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) {
        setErr(j?.detail || '建立訂單失敗')
        setLoading(false)
        return
      }
      // 清空購物車（前端）
      try { localStorage.removeItem('cart_v1'); localStorage.removeItem('cart') } catch {}
      router.push(`/checkout/confirm/${j.order_code}`)
    } catch (e: any) {
      setErr(e?.message || '發生錯誤')
      setLoading(false)
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">結帳</h1>

      {!!err && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{err}</div>}

      <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-6">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">顧客資料</h2>
          <input name="name" placeholder="姓名" className="w-full border rounded px-3 py-2" />
          <input name="email" placeholder="Email" className="w-full border rounded px-3 py-2" />
          <input name="phone" placeholder="電話" className="w-full border rounded px-3 py-2" />

          <h2 className="text-lg font-semibold pt-4">送貨資料</h2>
          <input name="country" placeholder="國家/地區" className="w-full border rounded px-3 py-2" />
          <input name="city" placeholder="城市" className="w-full border rounded px-3 py-2" />
          <input name="address" placeholder="地址" className="w-full border rounded px-3 py-2" />
          <input name="postal" placeholder="郵遞區號" className="w-full border rounded px-3 py-2" />

          <h2 className="text-lg font-semibold pt-4">備註</h2>
          <textarea name="note" placeholder="（選填）" className="w-full border rounded px-3 py-2 h-28" />
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">訂單項目</h2>
          {!cart.items.length ? (
            <p className="text-gray-500">購物車為空。</p>
          ) : (
            <div className="space-y-3">
              {cart.items.map(it => (
                <div key={`${it.merchant_slug}_${it.ig_media_id}`} className="border rounded p-3 text-sm">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-gray-500">@{it.merchant_slug}</div>
                  <div>數量：{it.qty}</div>
                  <div>單價：{(it.currency ?? 'HKD')} {typeof it.price === 'number' ? it.price.toLocaleString() : '—'}</div>
                </div>
              ))}
            </div>
          )}

          <button
            disabled={loading || !cart.items.length}
            className="w-full px-4 py-3 rounded-lg bg-black text-white disabled:opacity-50"
          >
            {loading ? '送出中…' : '送出訂單（線下支付）'}
          </button>
        </section>
      </form>
    </main>
  )
}