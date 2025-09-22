// components/AppHeader.tsx
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, Mail, Menu } from "lucide-react"

type FeatureItem = { label: string; bg: string; badge?: string }

const FEATURES: FeatureItem[] = [
  { label: "首頁", bg: "bg-red-500" },
  { label: "初創", bg: "bg-pink-500" },
  { label: "服務", bg: "bg-blue-500" },
  { label: "網店", bg: "bg-orange-500" },
  { label: "其他", bg: "bg-emerald-500" },
]

// 對應路徑
const routes: Record<string, string> = {
  首頁: "/",
  初創: "/startup",
  服務: "/service",
  網店: "/shop/categories",
}

export default function AppHeader({
  brand = "萬事屋",
  handle = "@yorozuya",
  activeFeature = "首頁", // 👈 新增參數，決定哪個 feature 被啟用
}: {
  brand?: string
  handle?: string
  activeFeature?: string
}) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const [rowH, setRowH] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  // 找到目前 active feature 的顏色
  const active = FEATURES.find((f) => f.label === activeFeature)
  const activeBg = active?.bg ?? "bg-red-500"

  // 高度量測
  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el) return
    const measure = () => setRowH(el.scrollHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 下滑收起，上滑展開
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
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] leading-none font-extrabold tracking-tight">
            {/* ✅ 動態套用 activeFeature 的顏色 */}
            <span className={`align-middle inline-block mx-1 h-[14px] w-[52px] rounded-sm ${activeBg}`} />
            {brand}
          </span>
          <span className="text-xs text-gray-500">{handle}</span>
        </div>
        <div className="flex items-center gap-2">
          <button aria-label="通知" className="p-2 rounded-lg hover:bg-gray-100 active:scale-95">
            <Bell size={20} />
          </button>
          <button aria-label="訊息" className="p-2 rounded-lg hover:bg-gray-100 active:scale-95">
            <Mail size={20} />
          </button>
          <button aria-label="選單" className="p-2 -mr-2 rounded-lg hover:bg-gray-100 active:scale-95">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* 彩色功能格 */}
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
        <div className="pb-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {FEATURES.map((it) => {
              const to = routes[it.label]
              return to ? (
                <Link
                  key={it.label}
                  href={to}
                  className={`${it.bg} shrink-0 h-14 rounded-xl px-4 text-white font-semibold relative flex items-center justify-center`}
                >
                  {it.label}
                  {it.badge && (
                    <span className="absolute -right-2 -top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-gray-900 shadow">
                      {it.badge}
                    </span>
                  )}
                </Link>
              ) : (
                <button
                  key={it.label}
                  className={`${it.bg} shrink-0 h-14 rounded-xl px-4 text-white font-semibold relative`}
                >
                  {it.label}
                  {it.badge && (
                    <span className="absolute -right-2 -top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-gray-900 shadow">
                      {it.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

    </header>
  )
}