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
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

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
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)

  // ✅ 讓 client 在整個元件生命週期穩定不變
  const supabase = useMemo(() => createSupabaseBrowser(), [])
  // 用來忽略過期的非同步回傳
  const aliveRef = useRef(true)

  const close  = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(v => !v), [])

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [close])

  useEffect(() => { close() }, [pathname, close])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = prev }
  }, [open])

  // ✅ 統一的拉取流程（雙路徑 + 短重試）
  const pull = useCallback(async () => {
    // 先嘗試 getSession
    const { data: { session } } = await supabase.auth.getSession()
    let user = session?.user ?? null

    // 若一開始拿不到，再補打一個 getUser（有些環境會先拿到 user 再補 session）
    if (!user) {
      const { data: ures } = await supabase.auth.getUser()
      user = ures?.user ?? null
    }

    if (!aliveRef.current) return

    setUserEmail(user?.email ?? null)
    setDisplayName((user?.user_metadata as any)?.display_name ?? null)

    if (user?.id) {
      // 讀一次 membership（僅第一次或登入/刷新後）
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

    // 首次載入先拉一次
    pull()

    // ⏳ 短時間重試（處理 Safari/快轉頁導致的延遲寫入）
    const retries = [150, 400, 1000] // 毫秒
    const timers = retries.map(ms => setTimeout(() => pull(), ms))

    // 訂閱 auth 狀態
    const { data: sub } = supabase.auth.onAuthStateChange(
  (event: AuthChangeEvent, session: Session | null) => {
    if (!aliveRef.current) return

    switch (event) {
      case 'SIGNED_OUT': {
        setUserEmail(null)
        setDisplayName(null)
        setIsOwner(false)
        break
      }

      case 'INITIAL_SESSION':
      case 'SIGNED_IN':
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
      case 'PASSWORD_RECOVERY':
      case 'MFA_CHALLENGE_VERIFIED': {
        const u = session?.user ?? null
        setUserEmail(u?.email ?? null)
        setDisplayName((u?.user_metadata as any)?.display_name ?? null)
        // 事件後再拉一次 membership，避免殘留
        pull()
        break
      }
      // 沒有 default，讓 TS 在未來有新事件時提示你
    }
  }
)

    // 當視窗回到前景時再拉一次（避免長時間休眠）
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
          {open && (
            <div className="fixed inset-0 z-[1400] bg-black/45" onClick={close} aria-hidden="true" />
          )}

          <aside
            className={`fixed right-0 top-0 h-full w-[82%] max-w-sm
                        bg-white text-gray-900 shadow-2xl border-l
                        flex flex-col transition-transform duration-300
                        ${open ? "translate-x-0" : "translate-x-full"}
                        z-[1500]`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="navdrawer-title"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="sticky top-0 z-[1] bg-white/95 backdrop-blur border-b">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-block h-3 w-10 rounded-full ${accent}`} />
                  <span id="navdrawer-title" className="text-base font-bold">導航選單</span>
                </div>
                <button aria-label="關閉選單" onClick={close} className="p-2 rounded-lg hover:bg-gray-100 active:scale-95">
                  <X size={20} />
                </button>
              </div>
            </div>

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
                            <span className="text-gray-500 truncate">{userEmail}</span>
                          </div>
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-1 text-red-600 hover:underline">
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
                      className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 active:bg-gray-200"
                    >
                      <LogIn size={18} />
                      <span>登入</span>
                    </Link>
                  )}
                </Section>
              </nav>
            </div>

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

function NavItem({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-100 active:bg-gray-200">
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  )
}