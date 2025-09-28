// components/NavDrawer.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { createPortal } from "react-dom"
import type { LucideIcon } from "lucide-react"
import {
  Menu, X, Home, Rocket, Wrench, Store,
  ShoppingCart, LogIn, LogOut, CloudSunIcon, User,
} from "lucide-react"
import { createSupabaseBrowser } from "@/lib/supabase-browser"

const FEATURE_COLORS: Record<string, string> = {
  首頁: "bg-red-500",
  網店: "bg-orange-500",
  初創: "bg-emerald-500",
  服務: "bg-blue-500",
  夢想: "bg-pink-500",
}

type Props = {
  activeFeature?: "首頁" | "初創" | "服務" | "網店" | "夢想"
  triggerClassName?: string
}

export default function NavDrawer({
  activeFeature = "首頁",
  triggerClassName = "p-2 -mr-2 rounded-lg hover:bg-gray-100 active:scale-95",
}: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const accent = FEATURE_COLORS[activeFeature] ?? "bg-red-500"

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const supabase = createSupabaseBrowser()

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

  // 監聽登入狀態
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserEmail(session?.user?.email ?? null)
    }
    checkUser()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  // 登出
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserEmail(null)
    close()
  }

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
                        bg-white text-gray-900 shadow-2xl border-l
                        flex flex-col
                        transition-transform duration-300
                        ${open ? "translate-x-0" : "translate-x-full"}
                        z-[1500]`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="navdrawer-title"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {/* Header */}
            <div className="sticky top-0 z-[1] bg-white/95 backdrop-blur border-b">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-3 w-10 rounded-full ${accent}`} />
                  <span id="navdrawer-title" className="text-base font-bold">導航選單</span>
                </div>
                <button
                  aria-label="關閉選單"
                  onClick={close}
                  className="p-2 rounded-lg hover:bg-gray-100 active:scale-95"
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
                  <NavItem href="/shop/categories" icon={Store} label="網店專區" />
                  <NavItem href="/startup" icon={Rocket} label="初創專區" />
                  <NavItem href="/service" icon={Wrench} label="服務專區" />
                  <NavItem href="/dreams" icon={CloudSunIcon} label="我有一個夢想⋯" />
                </Section>

                <Section title="功能">
                  <NavItem href="/cart" icon={ShoppingCart} label="購物車" />
                </Section>

                <Section title="帳號">
                  {userEmail ? (
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <User size={18} />
                        <span>{userEmail}</span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-1 text-red-600 hover:underline"
                      >
                        <LogOut size={16} />
                        登出
                      </button>
                    </div>
                  ) : (
                    <Link
                      href={`/login?redirect=${encodeURIComponent(pathname)}`}
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 active:bg-gray-200"
                    >
                      <LogIn size={18} />
                      <span>登入</span>
                    </Link>
                  )}
                </Section>
              </nav>
            </div>

            {/* Footer */}
            <div className="px-4 pb-6 pt-2 text-xs text-gray-400">
              © {new Date().getFullYear()} 萬事屋
            </div>
          </aside>
        </>,
        document.body
      )}
    </>
  )
}

/* 子元件 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="px-2 py-1 text-xs font-semibold text-gray-500">{title}</div>
      <div className="rounded-xl border bg-white overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  )
}

function NavItem({
  href, icon: Icon, label,
}: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 active:bg-gray-200"
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )
}