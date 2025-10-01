// app/(public)/dreams/[id]/page.tsx
import Link from "next/link"
import { redirect } from "next/navigation"
import AppHeader from "@/components/AppHeader"
import { getSb } from "@/lib/supabaseServer"
import DreamCard from "@/components/dreams/DreamCard"

export const dynamic = "force-dynamic"

type Props = { params: Promise<{ id: string }> }

export default async function DreamDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await getSb()

  // ✅ 要求登入
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent(`/dreams/${id}`)}`)
  }

  // ✅ 查公開 view（不碰 membership，避免權限炸掉）
  const { data: dream, error } = await supabase
    .from("v_dreams_public")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) console.error("dream load error:", error)

  return (
    <main className="mx-auto max-w-[1080px]">
      <AppHeader brand="萬事屋" handle="@maxhse_com" activeFeature="夢想" />

      <section className="px-4 py-6 pb-24">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">夢想詳情</h2>
            {dream && (
              <p className="mt-1 text-xs text-gray-500">
                發佈者：{dream.display_name ?? "匿名"}
              </p>
            )}
          </div>

          <Link href="/dreams" className="text-sm text-gray-600 underline hover:text-gray-800">
            回到清單
          </Link>
        </div>

        {!dream ? (
          <div className="rounded-2xl border bg-white p-6 text-gray-500">
            找不到這個夢想。
          </div>
        ) : (
          <DreamCard dream={dream as any} />
        )}
      </section>
    </main>
  )
}