// app/page.tsx
import Link from "next/link"
import Image from "next/image"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import {
  Home as HomeIcon, Wallet, Download, Gift, Inbox, // ← 這裡把 Home 取別名
  Menu, ScanLine, Bell, Mail
} from "lucide-react"

export const dynamic = "force-dynamic"

async function getServerSupabase() {
  const jar = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return jar.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            jar.set({ name, value, ...options })
          })
        },
      },
    }
  )
}

export default async function Home() {
  const supabase = await getServerSupabase()

  const { data: merchants, error } = await supabase
    .from("merchants")
    .select("slug, name")
    .eq("is_public", true)
    .order("created_at", { ascending: true })

  if (error) console.error("merchants query error:", error)

  return (
    <main className="mx-auto max-w-[720px]">
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button aria-label="掃碼" className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:scale-95">
            <ScanLine size={22} />
          </button>
          <div className="flex items-baseline gap-1">
            <span className="text-[28px] leading-none font-extrabold tracking-tight">
              萬事屋<span className="align-middle inline-block mx-1 h-[14px] w-[52px] rounded-sm bg-red-500" />
            </span>
            <span className="text-xs text-gray-500">@yorozuya</span>
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

        {/* 彩色功能格（可左右滑動） */}
        <div className="px-4 pb-3">
          <div className="flex gap-3 overflow-x-auto no-scrollbar">
            {[
              { label: "初創", bg: "bg-pink-500" },
              { label: "服務", bg: "bg-blue-500", badge: "34" },
              { label: "網店", bg: "bg-orange-500" },
              { label: "其他", bg: "bg-emerald-500" },
            ].map((it) => (
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

        {/* Tab 切換列 */}
        <nav className="px-2 border-b">
          <ul className="grid grid-cols-3 text-center">
            {["首頁", "熱門", "最新"].map((t, i) => (
              <li key={t} className="relative">
                <button
                  className={`w-full py-3 text-sm font-semibold ${i === 0 ? "text-gray-900" : "text-gray-500"}`}
                >
                  {t}
                </button>
                {i === 0 && <div className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-red-500" />}
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {/* Banner 區塊 */}
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-2xl border bg-[#f6a400]">
          <div className="aspect-[3/4] sm:aspect-[16/9] grid place-items-center p-6">
            <div className="text-center">
              <div className="mx-auto mb-3 inline-block rounded-full border-2 border-red-700 px-4 py-2 text-lg font-extrabold text-red-800">
                本週推薦
              </div>
              <h3 className="text-white text-xl font-black tracking-wide"><br/>BAPRE Store</h3>
              <p className="mt-3 max-w-xs text-white/90 text-sm">
                Spread Mid-Autumn good wishes. Save thousands of mooncakes from going to landfill.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 文章標題/說明 */}
      <section className="px-4 py-5">
        <h2 className="text-[22px] font-bold leading-snug">「樂餸中秋」月餅捐贈行動 2025</h2>
        <p className="mt-2 text-gray-600 text-sm">秉憐將於 2025 年 9 月 15 至 26 日推行「樂餸中秋 2025」……</p>
      </section>

      {/* 商戶卡片 */}
      {!!merchants?.length && (
        <section className="px-4 pb-6">
          <h3 className="mb-3 text-base font-semibold">商戶專區</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {merchants.map((m) => (
              <Link
                key={m.slug}
                href={`/shop/${m.slug}`}
                className="group rounded-2xl border bg-white p-4 shadow-sm active:scale-[0.98]"
              >
                <div className="h-20 w-full rounded-xl bg-gray-100 grid place-items-center text-gray-400 text-xs">
                  封面
                </div>
                <div className="mt-2 line-clamp-1 font-medium group-hover:underline">{m.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 登入 / 後台捷徑 
      <section className="px-4 pb-24">
        <div className="flex gap-3">
          <Link href="/login" className="px-3 py-2 border rounded-xl active:scale-95">登入</Link>
          <Link href="/dashboard" className="px-3 py-2 border rounded-xl active:scale-95">後台</Link>
        </div>
      </section>*/}

      {/* Bottom Nav */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t bg-white/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-[720px] grid-cols-5 text-center text-xs">
          {[
            { icon: HomeIcon, label: "主頁", href: "/" },   // ← 這裡改用 HomeIcon
            { icon: Wallet, label: "錢包", href: "/wallet" },
            { icon: Download, label: "賺取", href: "/earn" },
            { icon: Gift, label: "獎賞", href: "/rewards" },
            { icon: Inbox, label: "會籍", href: "/account" },
          ].map(({ icon: Icon, label, href }, idx) => (
            <li key={label}>
              <Link href={href} className="block py-2.5">
                <div className={`grid place-items-center ${idx === 0 ? "text-gray-900" : "text-gray-500"}`}>
                  <Icon size={20} />
                  <span className="mt-1">{label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  )
}