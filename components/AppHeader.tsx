// components/AppHeader.tsx
"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Link from "next/link"
import { ShoppingCart } from "lucide-react"
import NavDrawer from "@/components/NavDrawer"

export type FeatureLabel = "首頁" | "初創" | "服務" | "網店" | "夢想"
type FeatureItem = { label: FeatureLabel; bgLight: string; bgDark: string; badge?: string }

const FEATURES: FeatureItem[] = [
  { label: "首頁", bgLight: "bg-red-500",     bgDark: "bg-red-400" },
  { label: "網店", bgLight: "bg-orange-500",  bgDark: "bg-orange-400" },
  { label: "初創", bgLight: "bg-emerald-500", bgDark: "bg-emerald-400" },
  { label: "服務", bgLight: "bg-blue-500",    bgDark: "bg-blue-400" },
  { label: "夢想", bgLight: "bg-pink-500",    bgDark: "bg-pink-400" },
]

const routes: Record<FeatureLabel, string> = {
  首頁: "/",
  初創: "/startup",
  服務: "/service",
  網店: "/shop/categories",
  夢想: "/dreams",
}

export default function AppHeader({
  brand = "萬事屋",
  handle = "@maxhse_com",
  activeFeature = "首頁",
}: {
  brand?: string
  handle?: string
  activeFeature?: FeatureLabel
}) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const [rowH, setRowH] = useState(0)
  const [collapsed, setCollapsed] = useState(false)

  const active = FEATURES.find((f) => f.label === activeFeature)
  const activeBar =
    `${active?.bgLight ?? "bg-red-500"} dark:${active?.bgDark ?? "bg-red-400"}`

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
      className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70
                 dark:bg-neutral-900/90 dark:supports-[backdrop-filter]:bg-neutral-900/70"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] leading-none font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
            <span className={`align-middle inline-block mx-1 h-[14px] w-[52px] rounded-sm ${activeBar}`} />
            {brand}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            aria-label="購物車"
            className="p-2 rounded-lg hover:bg-gray-100 active:scale-95
                       dark:hover:bg-neutral-800"
          >
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
            {FEATURES.map((it) => {
              const to = routes[it.label]
              const tileBg = `${it.bgLight} dark:${it.bgDark}`
              return to ? (
                <Link
                  key={it.label}
                  href={to}
                  className={`${tileBg} shrink-0 h-14 rounded-xl px-4 text-white font-semibold
                              relative flex items-center justify-center
                              ring-1 ring-black/0 dark:ring-white/0 hover:ring-black/10 dark:hover:ring-white/10`}
                >
                  {it.label}
                  {it.badge && (
                    <span className="absolute -right-2 -top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-gray-900 shadow
                                     dark:bg-neutral-900/95 dark:text-gray-100">
                      {it.badge}
                    </span>
                  )}
                </Link>
              ) : (
                <button
                  key={it.label}
                  className={`${tileBg} shrink-0 h-14 rounded-xl px-4 text-white font-semibold relative
                              ring-1 ring-black/0 dark:ring-white/0 hover:ring-black/10 dark:hover:ring-white/10`}
                >
                  {it.label}
                  {it.badge && (
                    <span className="absolute -right-2 -top-2 rounded-full bg-white/95 px-2 py-0.5 text-xs font-bold text-gray-900 shadow
                                     dark:bg-neutral-900/95 dark:text-gray-100">
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