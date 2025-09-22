// app/(public)/service/page.tsx
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import CollapsibleHeader from "@/components/CollapsibleHeader"
import AppHeader from "@/components/AppHeader"

export const dynamic = "force-dynamic"

type Service = {
  slug: string
  name: string
  desc: string
  priceFrom?: number
  unit?: string
}

const SERVICES: Service[] = [
  { slug: "branding", name: "品牌設計", desc: "Logo / VI / 名片版面", priceFrom: 12000, unit: "起" },
  { slug: "photo", name: "商品攝影", desc: "棚拍 / 修圖 / 速件", priceFrom: 1800, unit: "每件" },
  { slug: "ads", name: "社群投放", desc: "FB/IG 廣告代操", priceFrom: 5000, unit: "每週" },
  { slug: "web", name: "網站建置", desc: "企業官網 / 登陸頁", priceFrom: 38000, unit: "起" },
  { slug: "pos", name: "POS 方案", desc: "收銀 / 存貨 / 會員", priceFrom: 1200, unit: "每月" },
  { slug: "logistics", name: "物流整合", desc: "宅配/超取/跨境", priceFrom: 60, unit: "每件" },
]

const money = (n?: number) => (n == null ? "—" : n.toLocaleString())

export default function ServicePage() {
    return (
      <main className="mx-auto max-w-[720px]">
        <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="服務" />
  
        {/* Content */}
      <section className="px-4 py-6 pb-24">
        <h2 className="mb-3 text-xl font-bold">熱門服務</h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SERVICES.map(s => (
            <Link
              key={s.slug}
              href={`/service/${s.slug}`}
              className="group overflow-hidden rounded-2xl border bg-white p-3 shadow-sm active:scale-[0.98]"
            >
              <div className="h-20 w-full rounded-xl bg-gray-100 grid place-items-center text-gray-400 text-xs">
                圖片
              </div>
              <div className="mt-2 line-clamp-1 font-semibold group-hover:underline">{s.name}</div>
              <div className="mt-1 line-clamp-2 text-xs text-gray-600">{s.desc}</div>
              <div className="mt-2 text-sm font-semibold">
                {s.priceFrom != null ? `NT$ ${money(s.priceFrom)} ${s.unit ?? ""}` : "—"}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6">
          <Link href="/service/contact" className="inline-flex items-center rounded-xl border px-4 py-3 active:scale-95">
            需求洽談
          </Link>
        </div>
      </section>
    </main>
  )
}