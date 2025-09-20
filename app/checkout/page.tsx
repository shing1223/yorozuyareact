'use client'
import { useEffect, useState } from 'react'
import { readCart, clearCart } from '@/lib/cart-storage'

export default function CheckoutPage() {
  const [cart, setCart] = useState(readCart())
  const [submitting, setSubmitting] = useState(false)
  const [method, setMethod] = useState<'card_platform'|'offline'>('card_platform')

  useEffect(() => setCart(readCart()), [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData(e.currentTarget)
      fd.append('cart', JSON.stringify(cart))         // 把購物車一併送到後端
      fd.append('payment_method', method)

      const r = await fetch('/api/checkout', { method:'POST', body: fd })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        alert(j.detail || '下單失敗，請稍後再試')
        return
      }
      const j = await r.json()
      // 若平台代收，後端可回傳 payment_url；離線付款就回傳 order_id
      if (j.payment_url) {
        window.location.href = j.payment_url
      } else {
        clearCart()
        window.location.href = `/orders/${j.order_id}`  // 訂單完成頁
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 grid lg:grid-cols-3 gap-6">
      <form onSubmit={onSubmit} className="lg:col-span-2 space-y-6">
        {/* 顧客資料 */}
        <section className="border rounded p-4 space-y-3">
          <h2 className="font-semibold">顧客資料</h2>
          <input name="customer_name" placeholder="姓名" required className="w-full border p-2 rounded" />
          <input name="customer_email" type="email" placeholder="Email" required className="w-full border p-2 rounded" />
          <input name="customer_phone" placeholder="電話" className="w-full border p-2 rounded" />
        </section>

        {/* 送貨資料 */}
        <section className="border rounded p-4 space-y-3">
          <h2 className="font-semibold">送貨資料</h2>
          <input name="ship_name" placeholder="收件人" required className="w-full border p-2 rounded" />
          <input name="ship_phone" placeholder="收件電話" className="w-full border p-2 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <input name="ship_country" placeholder="國家/地區" className="border p-2 rounded" />
            <input name="ship_city" placeholder="城市" className="border p-2 rounded" />
          </div>
          <input name="ship_address" placeholder="地址" required className="w-full border p-2 rounded" />
          <input name="ship_zip" placeholder="郵遞區號" className="w-full border p-2 rounded" />
          <select name="ship_method" className="border p-2 rounded">
            <option value="standard">標準宅配</option>
            <option value="pickup">門市自取</option>
          </select>
        </section>

        {/* 備註 */}
        <section className="border rounded p-4 space-y-3">
          <h2 className="font-semibold">備註</h2>
          <textarea name="notes" rows={4} className="w-full border p-2 rounded" />
        </section>

        {/* 付款 */}
        <section className="border rounded p-4 space-y-3">
          <h2 className="font-semibold">付款方式</h2>
          <label className="flex items-center gap-2">
            <input type="radio" name="pm" checked={method==='card_platform'} onChange={()=>setMethod('card_platform')} />
            平台代收（信用卡）
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="pm" checked={method==='offline'} onChange={()=>setMethod('offline')} />
            線下付款（匯款/轉帳/其他）
          </label>
          <button disabled={submitting} className="px-4 py-2 rounded bg-black text-white">
            {submitting ? '建立訂單中…' : '確認下單'}
          </button>
        </section>
      </form>

      {/* 訂單摘要 */}
      <aside className="border rounded p-4 h-fit space-y-3">
        <h2 className="font-semibold">訂單摘要</h2>
        {/* 你可重用購物車 totalsByCurrency 的計算 */}
        {/* …顯示品項、金額… */}
      </aside>
    </main>
  )
}