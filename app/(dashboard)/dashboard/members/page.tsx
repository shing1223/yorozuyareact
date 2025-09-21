// app/(dashboard)/dashboard/merchants/new/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function NewMerchantPage({ searchParams }: { searchParams?: { ok?: string; error?: string } }) {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard/members')

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">建立商戶</h1>
        <Link href="/dashboard" className="text-blue-600 underline">← 回後台</Link>
      </div>

      {searchParams?.ok && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-800">
          已建立商戶：{decodeURIComponent(searchParams.ok)}
        </div>
      )}
      {searchParams?.error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action="/api/members/add" method="post" className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">商戶代稱（slug）</label>
          <input name="slug" placeholder="shop2" required className="w-full rounded border px-3 py-2" />
          <p className="text-xs text-gray-500 mt-1">僅限小寫英數與 -，例如：shop2、blue-cafe</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">商戶名稱（name）</label>
          <input name="name" placeholder="我的第二間店" required className="w-full rounded border px-3 py-2" />
        </div>
        <button className="w-full rounded bg-black px-4 py-2 text-white">建立商戶</button>
      </form>
    </main>
  )
}