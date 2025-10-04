// components/NavDrawer.tsx
"use client"

import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import type { LucideIcon } from "lucide-react"
import {
  Menu, X, Home, Rocket, Wrench, Store,
  ShoppingCart, LogIn, LogOut, CloudSunIcon, User, LayoutDashboard,
} from "lucide-react"
import { createSupabaseBrowser } from "@/lib/supabase-browser"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

// 用靜態 class，避免動態字串被 Purge 掉，並提供 dark: 對應顏色
const FEATURE_BARS: Record<string, string> = {
  首頁: "bg-red-500 dark:bg-red-400",
  網店: "bg-orange-500 dark:bg-orange-400",
  初創: "bg-emerald-500 dark:bg-emerald-400",
  服務: "bg-blue-500 dark:bg-blue-400",
  夢想: "bg-pink-500 dark:bg-pink-400",
}

type Props = {
  activeFeature?: "首頁" | "初創" | "服務" | "網店" | "夢想"
  triggerClassName?: string
}

export default function NavDrawer({
  activeFeature = "首頁",
  triggerClassName = "p-2 -mr-2 rounded-lg hover:bg-gray-100 active:scale-95 dark:hover:bg-neutral-800",
}: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const accent = FEATURE_BARS[activeFeature] ?? "bg-red-500 dark:bg-red-400"

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  // 保持 supabase client 穩定
  const supabase = useMemo(() => createSupabaseBrowser(), [])
  const aliveRef = useRef(true)

  const close  = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(v => !v), [])

  useEffect(() => setMounted(true), [])

  // Esc 關閉
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [close])

  // 路由變更時自動關閉
  useEffect(() => { close() }, [pathname, close])

  // 打開時禁止 body 捲動
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  // 統一拉取流程（getSession → getUser 回退）
  const pull = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    let user = session?.user ?? null
    if (!user) {
      const { data: ures } = await supabase.auth.getUser()
      user = ures?.user ?? null
    }
    if (!aliveRef.current) return

    setUserEmail(user?.email ?? null)
    setDisplayName((user?.user_metadata as any)?.display_name ?? null)

    if (user?.id) {
      const { data, error } = await supabase
        .from("membership")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)

      if (!aliveRef.current) return
      setIsOwner(!error && !!data?.some(r => String(r.role).toLowerCase() === "owner"))
    } else {
      setIsOwner(false)
    }
  }, [supabase])

  useEffect(() => {
    aliveRef.current = true

    // 首次拉取
    pull()

    // 短重試（處理 Safari/快轉頁）
    const retries = [150, 400, 1000, 2000]
    const timers = retries.map(ms => setTimeout(() => pull(), ms))

    // 訂閱 auth 事件
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!aliveRef.current) return

        switch (event) {
          case "SIGNED_OUT": {
            setUserEmail(null)
            setDisplayName(null)
            setIsOwner(false)
            break
          }
          case "INITIAL_SESSION":
          case "SIGNED_IN":
          case "TOKEN_REFRESHED":
          case "USER_UPDATED":
          case "PASSWORD_RECOVERY":
          case "MFA_CHALLENGE_VERIFIED": {
            const u = session?.user ?? null
            setUserEmail(u?.email ?? null)
            setDisplayName((u?.user_metadata as any)?.display_name ?? null)
            // 事件後排隊再拉一次 membership，避免競態
            setTimeout(() => { if (aliveRef.current) pull() }, 0)
            break
          }
        }
      }
    )

    // 視窗回前景再拉一次
    const onVisible = () => { if (document.visibilityState === "visible") pull() }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      aliveRef.current = false
      sub.subscription.unsubscribe()
      document.removeEventListener("visibilitychange", onVisible)
      timers.forEach(t => clearTimeout(t))
    }
  }, [pull, supabase])

  // 登出
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    setDisplayName(null)
    setIsOwner(false)
    close()
  }

  const safePath = useMemo(() => (pathname && pathname.startsWith("/") ? pathname : "/"), [pathname])

  return (
    <>
      {/* 觸發按鈕 */}
      <button aria-label="選單" onClick={toggle} className={triggerClassName}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mounted && createPortal(
        <>
          {/* Overlay */}
          {open && (
            <div
              className="fixed inset-0 z-[1400] bg-black/45"
              onClick={close}
              aria-hidden="true"
            />
          )}

          {/* Drawer */}
          <aside
            className={`fixed right-0 top-0 h-full w-[82%] max-w-sm
                        bg-white text-gray-900 shadow-2xl border-l border-gray-200
                        dark:bg-neutral-900 dark:text-gray-100 dark:border-neutral-800
                        flex flex-col transition-transform duration-300
                        ${open ? "translate-x-0" : "translate-x-full"}
                        z-[1500]`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="navdrawer-title"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-[1] bg-white/95 backdrop-blur border-b border-gray-200 dark:bg-neutral-900/95 dark:border-neutral-800">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-3 w-10 rounded-full ${accent}`} />
                  <span id="navdrawer-title" className="text-base font-bold">導航選單</span>
                </div>
                <button
                  aria-label="關閉選單"
                  onClick={close}
                  className="p-2 rounded-lg hover:bg-gray-100 active:scale-95 dark:hover:bg-neutral-800"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* 內容 */}
            <div className="flex-1 overflow-y-auto">
              <nav className="px-2 py-3">
                <Section title="探索">
                  <NavItem href="/" icon={Home} label="首頁" />
                  <NavItem href="/shop/categories" icon={Store} label="網店" />
                  <NavItem href="/startup" icon={Rocket} label="初創" />
                  <NavItem href="/service" icon={Wrench} label="服務" />
                  <NavItem href="/dreams" icon={CloudSunIcon} label="我有一個夢想⋯" />
                </Section>

                <Section title="功能">
                  <NavItem href="/cart" icon={ShoppingCart} label="購物車" />
                </Section>

                <Section title="帳號">
                  {userEmail ? (
                    <>
                      <div className="flex items-center justify-between px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User size={18} />
                          <div className="flex flex-col min-w-0">
                            {displayName && <span className="font-medium truncate">{displayName}</span>}
                            <span className="text-gray-500 dark:text-gray-400 truncate">{userEmail}</span>
                          </div>
                        </div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-1 text-red-600 hover:underline"
                        >
                          <LogOut size={16} />
                          登出
                        </button>
                      </div>

                      <NavItem href="/settings" icon={User} label="設定" />
                      {isOwner && <NavItem href="/dashboard" icon={LayoutDashboard} label="商家後台" />}
                    </>
                  ) : (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(safePath)}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-800/80"
                    >
                      <LogIn size={18} />
                      <span>登入</span>
                    </Link>
                  )}
                </Section>
              </nav>
            </div>

            {/* Footer */}
            <div className="px-4 pb-6 pt-2 text-xs text-gray-400 dark:text-gray-500">
              © {new Date().getFullYear()} 萬事屋 | MaxHse. All rights reserved.
            </div>
    
          </aside>
        </>,
        document.body
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{title}</div>
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm border-gray-200 dark:bg-neutral-900 dark:border-neutral-800">
        {children}
      </div>
    </div>
  )
}

function NavItem({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-800/80"
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )
}