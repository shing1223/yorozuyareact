// lib/cart-storage.ts
import type { Cart, CartItemInput } from '@/types/cart'

const KEY = 'cart_v1'

export function readCart(): Cart {
  if (typeof window === 'undefined') return { items: [] }
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Cart) : { items: [] }
  } catch {
    return { items: [] }
  }
}

export function writeCart(cart: Cart) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(cart))
}

/**
 * 新增或累加購物車項目。
 * 接受 CartItemInput（可包含 price/currency，也可選擇帶 qty）
 */
export function addItem(item: CartItemInput): Cart {
  const cart = readCart()

  const idx = cart.items.findIndex(
    (i) => i.merchant_slug === item.merchant_slug && i.ig_media_id === item.ig_media_id
  )

  const delta = item.qty ?? 1

  if (idx >= 0) {
    cart.items[idx].qty += delta
  } else {
    cart.items.push({ ...item, qty: delta })
  }

  writeCart(cart)
  return cart
}

export function updateQty(merchant: string, mediaId: string, qty: number): Cart {
  const cart = readCart()
  const idx = cart.items.findIndex(
    (i) => i.merchant_slug === merchant && i.ig_media_id === mediaId
  )
  if (idx >= 0) {
    cart.items[idx].qty = Math.max(1, Math.floor(qty || 1))
    writeCart(cart)
  }
  return cart
}

export function removeItem(merchant: string, mediaId: string): Cart {
  const cart = readCart()
  const next = cart.items.filter(
    (i) => !(i.merchant_slug === merchant && i.ig_media_id === mediaId)
  )
  const updated = { items: next }
  writeCart(updated)
  return updated
}

export function clearCart(): void {
  writeCart({ items: [] })
}