// app/settings/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import { Suspense } from "react"
import SettingsClient from "./SettingsClient"

export const dynamic = "force-dynamic"

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="首頁" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">帳號設定</h2>
        </div>

        <Suspense fallback={<div className="p-6 text-gray-500">載入中…</div>}>
          <SettingsClient />
        </Suspense>
      </section>
    </main>
  )
}