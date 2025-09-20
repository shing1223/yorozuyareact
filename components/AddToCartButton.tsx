'use client'

import { useState } from 'react'
import { addItem } from '@/lib/cart-storage'
import type { CartItem } from '@/types/cart'
import Link from 'next/link'

type Props = {
  item: Omit<CartItem, 'qty'>
  qty?: number
}

export default function AddToCartButton({ item, qty = 1 }: Props) {
  const [added, setAdded] = useState(false)

  return added ? (
    <Link
      href="/cart"
      className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-green-600 text-white"
    >
      已加入，前往購物車
    </Link>
  ) : (
    <button
      className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-black text-white"
      onClick={() => {
        addItem(item, qty)
        setAdded(true)
      }}
    >
      加入購物車
    </button>
  )
}