// app/dreams/create/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import NewDreamForm from "@/components/dreams/NewDreamForm"

export const dynamic = "force-dynamic"

export default function DreamCreatePage() {
  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="夢想" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">發佈你的夢想</h2>
          <Link
            href="/dreams"
            className="text-sm text-gray-600 underline hover:text-gray-800"
          >
            回到清單
          </Link>
        </div>

        <NewDreamForm />
      </section>
    </main>
  )
}