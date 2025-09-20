// lib/cart-storage.ts
import type { Cart, CartItem, CartItemInput } from '@/types/cart'

const KEY = 'cart_v1'

// 簡單遷移：如果還有舊 key，就搬到新 key
function migrateIfNeeded() {
  if (typeof window === 'undefined') return
  const legacy = window.localStorage.getItem('cart')
  const v1 = window.localStorage.getItem(KEY)
  if (legacy && !v1) {
    window.localStorage.setItem(KEY, legacy)
    window.localStorage.removeItem('cart')
  }
}

export function readCart(): Cart {
  if (typeof window === 'undefined') return { items: [] }
  try {
    migrateIfNeeded()
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Cart) : { items: [] }

    // 正規化（確保 currency 預設，qty 合法）
    parsed.items = (parsed.items ?? []).map((i) => ({
      ...i,
      qty: Math.max(1, Number(i.qty) || 1),
      // 沒帶幣別就預設 TWD（依你平台習慣調整）
      currency: i.currency ?? 'TWD',
    }))
    return parsed
  } catch {
    return { items: [] }
  }
}

export function writeCart(cart: Cart) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(cart))
}

// ✅ 單一 addItem：接受 CartItemInput（可含 price/currency），內部會補 qty
export function addItem(item: CartItemInput) {
  const cart = readCart()
  const idx = cart.items.findIndex(
    (i) => i.ig_media_id === item.ig_media_id && i.merchant_slug === item.merchant_slug
  )
  const qty = Math.max(1, Number(item.qty ?? 1))
  if (idx >= 0) {
    cart.items[idx].qty += qty
  } else {
    const toInsert: CartItem = {
      merchant_slug: item.merchant_slug,
      ig_media_id: item.ig_media_id,
      title: item.title,
      image: item.image,
      permalink: item.permalink,
      caption: item.caption,
      price: typeof item.price === 'number' ? item.price : undefined,
      currency: item.currency ?? 'TWD',
      qty,
    }
    cart.items.push(toInsert)
  }
  writeCart(cart)
  return cart
}

export function updateQty(merchant: string, mediaId: string, qty: number) {
  const cart = readCart()
  const i = cart.items.findIndex(
    (it) => it.merchant_slug === merchant && it.ig_media_id === mediaId
  )
  if (i >= 0) {
    cart.items[i].qty = Math.max(1, Number(qty) || 1)
    writeCart(cart)
  }
  return cart
}

export function removeItem(merchant: string, mediaId: string) {
  const cart = readCart()
  const next = cart.items.filter(
    (i) => !(i.merchant_slug === merchant && i.ig_media_id === mediaId)
  )
  writeCart({ items: next })
  return { items: next }
}

export function clearCart() {
  writeCart({ items: [] })
}