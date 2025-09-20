'use client'

import { useState } from 'react'
import { addItem } from '@/lib/cart-storage'
import type { CartItemInput } from '@/types/cart'   // ✅ 改成 import CartItemInput
import Link from 'next/link'

type Props = {
  qty?: number
  item: CartItemInput   // ✅ 使用 CartItemInput
  className?: string
}

export default function AddToCartButton({ item, qty = 1, className }: Props) {
  const [added, setAdded] = useState(false)

  function onAdd() {
    addItem({ ...item, qty })  // ✅ 把 qty 一併存進去
    setAdded(true)
  }

  return added ? (
    <Link
      href="/cart"
      className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-green-600 text-white"
    >
      已加入，前往購物車
    </Link>
  ) : (
    <button
      onClick={onAdd}
      className={className ?? 'px-4 py-3 rounded-lg bg-black text-white'}
    >
      加入購物車
    </button>
  )
}