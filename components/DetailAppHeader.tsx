// components/DetailAppHeader.tsx
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { ShoppingCart, Menu, ChevronLeft } from "lucide-react"
import NavDrawer from "@/components/NavDrawer"

const FEATURE_COLORS_BG: Record<string, string> = {
  首頁: "bg-red-500",
  初創: "bg-pink-500",
  服務: "bg-blue-500",
  網店: "bg-orange-500",
  其他: "bg-emerald-500",
}

// 給返回箭頭用的文字色系
const FEATURE_COLORS_TEXT: Record<string, string> = {
  首頁: "text-red-500",
  初創: "text-pink-500",
  服務: "text-blue-500",
  網店: "text-orange-500",
  其他: "text-emerald-500",
}

export default function DetailAppHeader({
  brand = "萬事屋",
  handle = "@maxhse_com",
  activeFeature = "首頁",
  backHref,
  showFeatureRow = false, // 仍保留開關，但預設不顯示
}: {
  brand?: string
  handle?: string
  activeFeature?: "首頁" | "初創" | "服務" | "網店" | "夢想"
  backHref?: string
  showFeatureRow?: boolean
}) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const [rowH, setRowH] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  // 依來源設定顏色（箭頭用文字色、保留背景色以備未來擴充）
  const activeBg = FEATURE_COLORS_BG[activeFeature] ?? "bg-red-500"
  const activeText = FEATURE_COLORS_TEXT[activeFeature] ?? "text-red-500"

  // （若未來開啟 feature row 才需要）
  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el) return
    const measure = () => setRowH(el.scrollHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let ticking = false
    let lastY = window.scrollY
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const dy = y - lastY
        if (y < 24) setCollapsed(false)
        else if (dy > 6) setCollapsed(true)
        else if (dy < -6) setCollapsed(false)
        lastY = y
        ticking = false
      })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* 第一行：返回鍵 + 標題（箭頭依 activeFeature 上色） */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-3 border-b">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {backHref && (
            <Link
              href={backHref}
              aria-label="返回上一頁"
              className={`p-2 rounded-lg hover:bg-gray-100 active:scale-95 ${activeText}`}
            >
              <ChevronLeft size={22} />
            </Link>
          )}
          <span className="text-[18px] sm:text-[20px] md:text-[22px] leading-none font-extrabold tracking-tight">
            {brand}
          </span>
          {/* 若要顯示小色條，可把下一行解除註解 */}
          {/* <span className={`ml-2 hidden sm:inline-block h-[10px] w-[36px] rounded-sm ${activeBg}`} /> */}
          {handle && <span className="ml-2 text-xs text-gray-500">{handle}</span>}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 pr-1 sm:pr-0">
          
         <Link href="/cart" aria-label="購物車" className="p-2 rounded-lg hover:bg-gray-100 active:scale-95">
            <ShoppingCart size={20} />
          </Link>
          <NavDrawer activeFeature={activeFeature} />

        </div>
      </div>

      {/* （可選）第二行功能格，預設關閉 */}
      {showFeatureRow && (
        <div
          ref={rowRef}
          aria-hidden={collapsed}
          className="px-4 will-change-[max-height,opacity,transform]"
          style={{
            maxHeight: collapsed ? 0 : rowH,
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? "scaleY(0.98)" : "scaleY(1)",
            transition: "max-height 260ms ease, opacity 200ms ease, transform 260ms ease",
          }}
        >
          <div className="pb-3" />
        </div>
      )}
    </header>
  )
}