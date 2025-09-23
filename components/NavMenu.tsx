// components/NavMenu.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"

export default function NavMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      {/* 按鈕 */}
      <button
        aria-label="選單"
        onClick={() => setOpen(!open)}
        className="p-2 -mr-2 rounded-lg hover:bg-gray-100 active:scale-95"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* 下拉選單 */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl border bg-white shadow-lg overflow-hidden z-50">
          <nav className="flex flex-col">
            <Link
              href="/"
              className="px-4 py-2 text-sm hover:bg-gray-100 active:bg-gray-200"
              onClick={() => setOpen(false)}
            >
              首頁
            </Link>
            <Link
              href="/startup"
              className="px-4 py-2 text-sm hover:bg-gray-100 active:bg-gray-200"
              onClick={() => setOpen(false)}
            >
              初創專區
            </Link>
            <Link
              href="/service"
              className="px-4 py-2 text-sm hover:bg-gray-100 active:bg-gray-200"
              onClick={() => setOpen(false)}
            >
              服務專區
            </Link>
            <Link
              href="/shop/categories"
              className="px-4 py-2 text-sm hover:bg-gray-100 active:bg-gray-200"
              onClick={() => setOpen(false)}
            >
              網店專區
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm hover:bg-gray-100 active:bg-gray-200"
              onClick={() => setOpen(false)}
            >
              後台
            </Link>
          </nav>
        </div>
      )}
    </div>
  )
}