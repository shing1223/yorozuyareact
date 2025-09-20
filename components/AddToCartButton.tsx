"use client"

import { useState } from "react"

type CartItem = {
  merchant_slug: string
  ig_media_id: string
  title: string
  image: string
  permalink?: string
  caption?: string
  qty?: number
}

export default function AddToCartButton({ item }: { item: CartItem }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)

  function addToCart() {
    setAdding(true)
    try {
      const key = "cart.v1"
      const raw = localStorage.getItem(key)
      const cart: CartItem[] = raw ? JSON.parse(raw) : []

      const idx = cart.findIndex(
        (x) => x.ig_media_id === item.ig_media_id && x.merchant_slug === item.merchant_slug
      )
      if (idx >= 0) {
        cart[idx].qty = (cart[idx].qty || 1) + 1
      } else {
        cart.push({ ...item, qty: 1 })
      }

      localStorage.setItem(key, JSON.stringify(cart))
      setAdded(true)
      setTimeout(() => setAdded(false), 1800)
    } finally {
      setAdding(false)
    }
  }

  return (
    <button
      onClick={addToCart}
      disabled={adding}
      className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-black text-white disabled:opacity-60"
    >
      {added ? "已加入購物車 ✓" : adding ? "加入中…" : "加入購物車"}
    </button>
  )
}