// app/dreams/[id]/page.tsx
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import { getSb } from "@/lib/supabaseServer"
import DreamCard from "@/components/dreams/DreamCard"

export const dynamic = "force-dynamic"

type Props = { params: { id: string } }

export default async function DreamDetailPage({ params }: Props) {
  const supabase = await getSb()

  const { data: dream, error } = await supabase
    .from("v_dreams_full")
    .select("*, display_name")
    .eq("id", params.id)
    .maybeSingle()

  if (error) {
    console.error("dream load error:", error)
  }

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@yorozuya" activeFeature="夢想" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">夢想詳情</h2>
          <p className="mt-1 text-xs text-gray-500">
  發佈者：{dream.display_name ?? "匿名"}
</p>
          <Link href="/dreams" className="text-sm text-gray-600 underline hover:text-gray-800">
            回到清單
          </Link>
        </div>

        {!dream ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">
            請先登入。
          </div>
        ) : (
          // DreamCard 需要的欄位：id, title, public_content, hidden_content, up_count, down_count, created_at...
          <DreamCard dream={dream as any} />
        )}
      </section>
    </main>
  )
}