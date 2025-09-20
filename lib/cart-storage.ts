// lib/cart-storage.ts
import type { Cart, CartItem } from '@/types/cart'

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

export function addItem(item: Omit<CartItem, 'qty'>, qty = 1) {
  const cart = readCart()
  const idx = cart.items.findIndex(
    i => i.ig_media_id === item.ig_media_id && i.merchant_slug === item.merchant_slug
  )
  if (idx >= 0) {
    cart.items[idx].qty += qty
  } else {
    cart.items.push({ ...item, qty })
  }
  writeCart(cart)
  return cart
}

export function updateQty(merchant: string, mediaId: string, qty: number) {
  const cart = readCart()
  const i = cart.items.findIndex(i => i.merchant_slug === merchant && i.ig_media_id === mediaId)
  if (i >= 0) {
    cart.items[i].qty = Math.max(1, qty)
    writeCart(cart)
  }
  return cart
}

export function removeItem(merchant: string, mediaId: string) {
  const cart = readCart()
  const next = cart.items.filter(i => !(i.merchant_slug === merchant && i.ig_media_id === mediaId))
  writeCart({ items: next })
  return { items: next }
}

export function clearCart() {
  writeCart({ items: [] })
}