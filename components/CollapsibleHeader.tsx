// components/CollapsibleHeader.tsx
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { Bell, Mail, Menu } from "lucide-react"

type FeatureItem = { label: string; bg: string; badge?: string }

export default function CollapsibleHeader({
  brand = "萬事屋",
  handle = "@yorozuya",
  features = [
    { label: "首頁", bg: "bg-red-500" },
    { label: "初創", bg: "bg-pink-500" },
    { label: "服務", bg: "bg-blue-500", badge: "34" },
    { label: "網店", bg: "bg-orange-500" },
    { label: "其他", bg: "bg-emerald-500" },
  ],
  tabs = ["首頁", "熱門", "最新"],
}: {
  brand?: string
  handle?: string
  features?: FeatureItem[]
  tabs?: string[]
}) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const [rowH, setRowH] = useState<number>(0)
  const [collapsed, setCollapsed] = useState(false)

  // 量測實際高度，讓 max-height 有依據（內容改變也能重算）
  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el) return
    const measure = () => setRowH(el.scrollHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 基於捲動方向的顯示/隱藏（下滑收起，上滑展開；頂部強制展開）
  useEffect(() => {
    let ticking = false
    let lastY = window.scrollY

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const dy = y - lastY
        const goingDown = dy > 6
        const goingUp = dy < -6

        if (y < 24) {
          // 靠近頂部，永遠展開
          if (collapsed) setCollapsed(false)
        } else if (goingDown) {
          if (!collapsed) setCollapsed(true)
        } else if (goingUp) {
          if (collapsed) setCollapsed(false)
        }

        lastY = y
        ticking = false
      })
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [collapsed])

  return (
    <header
      className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] leading-none font-extrabold tracking-tight">
            <span className="align-middle inline-block mx-1 h-[14px] w-[52px] rounded-sm bg-red-500" />
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

      {/* 彩色功能格（可左右滑動）——可折疊區 */}
      <div
        ref={rowRef}
        aria-hidden={collapsed}
        className="px-4 will-change-[max-height,opacity,transform]"
        style={{
          // 展開用實際高度，收起設 0；用 CSS 過渡達到平滑收合
          maxHeight: collapsed ? 0 : rowH,
          opacity: collapsed ? 0 : 1,
          transform: collapsed ? "scaleY(0.98)" : "scaleY(1)",
          transition:
            "max-height 260ms ease, opacity 200ms ease, transform 260ms ease",
        }}
      >
        <div className="pb-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {features.map((it) => (
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
            ))}
          </div>
        </div>
      </div>

      {/* Tab 列（固定顯示） */}
      <nav className="px-2 border-b">
        <ul className="grid grid-cols-3 text-center">
          {tabs.map((t, i) => (
            <li key={t} className="relative">
              <button
                className={`w-full py-3 text-sm font-semibold ${
                  i === 0 ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {t}
              </button>
              {i === 0 && (
                <div className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-red-500" />
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}