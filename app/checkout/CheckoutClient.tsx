// app/checkout/CheckoutClient.tsx
"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { readCart, clearCart } from "@/lib/cart-storage"
import type { Cart, CartItem } from "@/types/cart"

type FormState = {
  name: string
  email: string
  phone: string
  country: string
  city: string
  address: string
  postal_code: string
  note: string
}

const FORM_STORAGE_KEY = "checkout_form_v1"

function loadForm(): FormState {
  if (typeof window === "undefined") {
    return {
      name: "", email: "", phone: "",
      country: "", city: "", address: "", postal_code: "", note: "",
    }
  }
  try {
    const raw = localStorage.getItem(FORM_STORAGE_KEY)
    if (raw) return JSON.parse(raw) as FormState
  } catch {}
  return {
    name: "", email: "", phone: "",
    country: "", city: "", address: "", postal_code: "", note: "",
  }
}

function saveForm(next: FormState) {
  try { localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(next)) } catch {}
}

const money = (n: number) => n.toLocaleString()
const emailOk = (s: string) => /\S+@\S+\.\S+/.test(s)
const phoneOk = (s: string) => s.trim().length >= 6 // 可改 libphonenumber

type PayMethod = "OFFLINE" | "STRIPE"

export default function CheckoutClient() {
  const [cart, setCart] = useState<Cart>({ items: [] })
  const [form, setForm] = useState<FormState>(loadForm)
  const [loading, setLoading] = useState(false)
  const [payLoading, setPayLoading] = useState(false)
  const [orderCode, setOrderCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState<PayMethod>("OFFLINE")

  useEffect(() => {
    setCart(readCart())
  }, [])

  // 表單變更
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setForm(prev => {
        const next = { ...prev, [name]: value }
        saveForm(next)
        return next
      })
    },
    []
  )

  // 統計：依幣別小計、總件數
  const { totals, totalItems, singleCurrency, singleTotal } = useMemo(() => {
    const map = new Map<string, number>()
    let count = 0
    for (const it of cart.items) {
      const cur = (it.currency || "HKD").toUpperCase()
      const line = (typeof it.price === "number" ? it.price : 0) * it.qty
      map.set(cur, (map.get(cur) || 0) + line)
      count += it.qty
    }
    const entries = Array.from(map.entries()) as Array<[string, number]>
    return {
      totals: entries,
      totalItems: count,
      singleCurrency: entries.length === 1 ? entries[0][0] : null,
      singleTotal: entries.length === 1 ? entries[0][1] : 0,
    }
  }, [cart.items])

  const canSubmit = useMemo(() => {
    if (!cart.items.length) return false
    if (!form.name.trim() || !emailOk(form.email) || !phoneOk(form.phone)) return false
    if (!form.country.trim() || !form.city.trim() || !form.address.trim()) return false
    return true
  }, [cart.items.length, form])

  const stripeEnabled = useMemo(() => {
    // 同一幣別 + 金額 > 0 才開放 Stripe
    return Boolean(singleCurrency && singleTotal > 0)
  }, [singleCurrency, singleTotal])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit || loading) return
    setLoading(true)
    setError(null)

    const payload = {
      customer: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      },
      shipping: {
        country: form.country.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        postal_code: form.postal_code.trim(),
      },
      note: form.note.trim(),
      items: cart.items,
    }

    try {
      const r = await fetch("/api/checkout/offline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.detail || j?.error || r.statusText)

      setOrderCode(j.order_code)
      clearCart()
      setCart({ items: [] })
      const cleared: FormState = {
        name: "", email: "", phone: "",
        country: "", city: "", address: "", postal_code: "", note: "",
      }
      setForm(cleared)
      saveForm(cleared)
    } catch (err: any) {
      setError(err?.message || "提交失敗，請稍後再試")
    } finally {
      setLoading(false)
    }
  }

  // 線上付款（Stripe）
  async function onPayOnline() {
    if (!canSubmit || payLoading) return
    if (!stripeEnabled) {
      setError("此訂單不支援線上付款（需同一幣別且金額大於 0）")
      return
    }
    setPayLoading(true)
    setError(null)

    const payload = {
      customer: {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      },
      shipping: {
        country: form.country.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        postal_code: form.postal_code.trim(),
      },
      note: form.note.trim(),
      items: cart.items,
    }

    try {
      const r = await fetch("/api/checkout/online", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.detail || j?.error || r.statusText)

      // 1) 後端回 url（建議）
      if (j?.url) {
        window.location.href = j.url
        return
      }
      // 2) 後端回 sessionId（備用）
      if (j?.sessionId) {
        window.location.href = `https://checkout.stripe.com/c/${j.sessionId}`
        return
      }
      throw new Error("未取得 Stripe 付款連結")
    } catch (err: any) {
      setError(err?.message || "線上付款初始化失敗，請稍後再試")
    } finally {
      setPayLoading(false)
    }
  }

  // 成功畫面
  if (orderCode) {
    return (
      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm
                      border-gray-200 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">訂單已送出</h3>
        <p className="text-gray-700 dark:text-gray-300">我們已收到你的訂單，請留意商戶聯繫（線下支付）。</p>
        <p className="text-gray-900 dark:text-gray-100">
          你的訂單編號：<b>{orderCode}</b>
        </p>
        <p className="text-gray-900 dark:text-gray-100">請記下訂單編號 / 截圖保存。</p>
        <Link href="/" className="text-blue-600 underline dark:text-blue-400">回首頁</Link>
      </div>
    )
  }

  // 空車畫面
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
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">顧客資料</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                name="name" value={form.name} onChange={onChange}
                placeholder="姓名 *" required
                className="rounded border px-3 py-2
                  border-gray-300 text-gray-900
                  dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="email" value={form.email} onChange={onChange}
                placeholder="Email *" type="email" required
                className="rounded border px-3 py-2
                  border-gray-300 text-gray-900
                  dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="phone" value={form.phone} onChange={onChange}
                placeholder="聯絡電話 *" required
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
                name="country" value={form.country} onChange={onChange}
                placeholder="國家/地區 *" required
                className="rounded border px-3 py-2
                  border-gray-300 text-gray-900
                  dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="city" value={form.city} onChange={onChange}
                placeholder="城市 *" required
                className="rounded border px-3 py-2
                  border-gray-300 text-gray-900
                  dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="address" value={form.address} onChange={onChange}
                placeholder="地址 *" required
                className="rounded border px-3 py-2 md:col-span-2
                  border-gray-300 text-gray-900
                  dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
              />
              <input
                name="postal_code" value={form.postal_code} onChange={onChange}
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
              name="note" value={form.note} onChange={onChange}
              placeholder="有什麼想補充的…"
              rows={3}
              className="w-full rounded border px-3 py-2
                border-gray-300 text-gray-900
                dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100"
            />
          </div>

          <div>
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">付款方式</h2>

            {/* 線下支付（原樣式保留） */}
            <div className="rounded border bg-gray-50 p-3
              border-gray-300 dark:border-neutral-700 dark:bg-neutral-800">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="pay_method"
                  value="OFFLINE"
                  checked={payMethod === "OFFLINE"}
                  onChange={() => setPayMethod("OFFLINE")}
                  className="mt-1"
                />
                <div>
                  <p className="text-gray-900 dark:text-gray-100">線下支付（OFFLINE）</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    送出訂單後，由商戶與你聯繫並提供付款方式；完成付款後安排出貨。
                  </p>
                </div>
              </label>
            </div>

            {/* 線上支付（Stripe）— 外觀沿用相同邏輯 */}
            <div className="mt-3 rounded border bg-gray-50 p-3
              border-gray-300 dark:border-neutral-700 dark:bg-neutral-800">
              <label className="flex items-start gap-2">
                <input
                  type="radio"
                  name="pay_method"
                  value="STRIPE"
                  checked={payMethod === "STRIPE"}
                  onChange={() => setPayMethod("STRIPE")}
                  className="mt-1"
                  disabled={!stripeEnabled}
                  title={!stripeEnabled ? "需同一幣別且金額大於 0" : undefined}
                />
                <div>
                  <p className="text-gray-900 dark:text-gray-100">線上支付（Stripe）</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    立即以信用卡/電子支付完成付款。
                    {!stripeEnabled && (
                      <>（需同一幣別且金額大於 0）</>
                    )}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {error && (
            <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          )}

          {/* 主要行動：依選擇的付款方式切換 */}
          {payMethod === "OFFLINE" ? (
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full rounded bg-black px-5 py-3 text-white disabled:opacity-50 md:w-auto
                hover:opacity-95 active:scale-[0.99]
                dark:bg-white dark:text-black"
            >
              {loading ? "送出中…" : "送出訂單"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onPayOnline}
              disabled={!canSubmit || !stripeEnabled || payLoading}
              className="w-full rounded bg-black px-5 py-3 text-white disabled:opacity-50 md:w-auto
                hover:opacity-95 active:scale-[0.99]
                dark:bg-white dark:text-black"
            >
              {payLoading ? "前往付款…" : "前往線上付款"}
            </button>
          )}

          {!emailOk(form.email) && form.email && (
            <p className="text-sm text-red-600 dark:text-red-300">Email 格式不正確</p>
          )}
          {!phoneOk(form.phone) && form.phone && (
            <p className="text-sm text-red-600 dark:text-red-300">電話號碼看起來不正確</p>
          )}
        </form>
      </section>

      {/* 右：摘要 */}
      <aside className="h-fit space-y-3 rounded border p-4
        border-gray-200 bg-white shadow-sm
        dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          訂單項目（{totalItems}）
        </h2>

        <div className="space-y-3">
          {cart.items.map((it: CartItem) => (
            <div
              key={`${it.merchant_slug}_${it.ig_media_id}`}
              className="rounded border p-3 text-sm
                border-gray-200 bg-white
                dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                {it.title}
              </div>
              <div className="text-gray-500 dark:text-gray-400">@{it.merchant_slug}</div>
              <div className="text-gray-700 dark:text-gray-300">數量：{it.qty}</div>
              <div className="text-gray-700 dark:text-gray-300">
                單價：{(it.currency ?? "HKD").toUpperCase()}{" "}
                {typeof it.price === "number" ? money(it.price) : "—"}
              </div>
            </div>
          ))}

          {totals.map(([cur, sum]) => (
            <div key={cur} className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">小計（{cur}）</span>
              <span className="text-gray-900 dark:text-gray-100">
                {cur} {money(sum)}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
          * 本訂單支援線下/線上支付；若要使用線上支付，請確保訂單為同一幣別且金額大於 0。
        </div>
      </aside>
    </div>
  )
}