// components/CollapsibleHeader.tsx
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import NavDrawer from "@/components/NavDrawer"

export type FeatureLabel = "首頁" | "初創" | "服務" | "網店" | "夢想"
type FeatureItem = { label: FeatureLabel; bg: string; badge?: string }

type TabLabel = "最新" | "熱門"

export default function CollapsibleHeader({
  brand = "萬事屋",
  handle = "@maxhse_com",
  features = [
    { label: "首頁", bg: "bg-red-500" },
    { label: "網店", bg: "bg-orange-500" },
    { label: "初創", bg: "bg-emerald-500" },
    { label: "服務", bg: "bg-blue-500" },
    { label: "夢想", bg: "bg-pink-500" },
  ] satisfies FeatureItem[],
  tabs = ["最新", "熱門"],
  activeFeature = "首頁",
  activeTab = "最新",
}: {
  brand?: string
  handle?: string
  features?: FeatureItem[]
  tabs?: TabLabel[]        // 只接受「最新 / 熱門」
  activeFeature?: FeatureLabel
  activeTab?: TabLabel     // 目前啟用的分頁
}) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const [rowH, setRowH] = useState<number>(0)
  const [collapsed, setCollapsed] = useState(false)

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

  // 功能格路徑
  const routes: Record<FeatureLabel, string> = {
    首頁: "/",
    初創: "/startup",
    服務: "/service",
    網店: "/shop/categories",
    夢想: "/dreams",
  }

  // Tabs 路徑（你可以改成別的 URL 結構）
  const tabRoutes: Record<TabLabel, string> = {
    最新: "/",
    熱門: "/hot",
  }

  const active = features.find((f) => f.label === activeFeature)
  const activeBg = active?.bg ?? "bg-red-500"

  return (
    <header
      className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] leading-none font-extrabold tracking-tight">
            <span className={`align-middle inline-block mx-1 h-[14px] w-[52px] rounded-sm ${activeBg}`} />
            {brand}
          </span>
          <span className="text-xs text-gray-500">{handle}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cart" aria-label="購物車" className="p-2 rounded-lg hover:bg-gray-100 active:scale-95">
            <ShoppingCart size={20} />
          </Link>
          <NavDrawer activeFeature={activeFeature} />
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
            {features.map((it) => {
              const to = routes[it.label]
              return to ? (
                <Link
                  key={it.label}
                  href={to}
                  className={`${it.bg} shrink-0 h-14 rounded-xl px-4 text-white font-semibold relative flex items-center justify-center`}
                >
                  {it.label}
                  {"badge" in it && it.badge && (
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
                  {"badge" in it && it.badge && (
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

      {/* Tabs → Link + active 樣式 */}
      <nav className="px-2 border-b">
        <ul className="grid grid-cols-2 text-center">
          {tabs.map((t) => {
            const href = tabRoutes[t]
            const isActive = t === activeTab
            return (
              <li key={t} className="relative">
                <Link
                  href={href}
                  className={`block w-full py-3 text-sm font-semibold ${
                    isActive ? "text-gray-900" : "text-gray-500"
                  }`}
                >
                  {t}
                </Link>
                {isActive && (
                  <div className={`absolute bottom-0 left-3 right-3 h-[3px] rounded-full ${activeBg}`} />
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}