// types/cart.ts
export type CartItem = {
  merchant_slug: string
  ig_media_id: string
  title: string
  image: string
  permalink?: string
  caption?: string
  price?: number // 之後可接真實價格
  qty: number
}

export type Cart = {
  items: CartItem[]
}