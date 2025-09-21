// app/(dashboard)/dashboard/members/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function MembersPage({
  searchParams,
}: {
  searchParams?: { ok?: string; error?: string }
}) {
  const supabase = await createSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login?redirect=/dashboard/members')

  // TODO: 之後可從使用者設定/選單取用；先寫死示範商戶
  const merchant = 'shop1'

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">商戶成員</h1>
        <Link href="/dashboard" className="text-blue-600 underline">← 回後台</Link>
      </div>

      {searchParams?.ok && (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-green-800">
          已新增成員：{decodeURIComponent(searchParams.ok)}
        </div>
      )}
      {searchParams?.error && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-red-800">
          {decodeURIComponent(searchParams.error)}
        </div>
      )}

      <form action="/api/members/add" method="post" className="space-y-4">
        <input type="hidden" name="merchant" value={merchant} />
        <div>
          <label className="block text-sm text-gray-600 mb-1">Email</label>
          <input
            name="email"
            type="email"
            required
            placeholder="user@example.com"
            className="w-full rounded border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-1">角色</label>
          <select name="role" defaultValue="member" className="w-full rounded border px-3 py-2">
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="owner">owner</option>
          </select>
        </div>

        <button className="w-full rounded bg-black px-4 py-2 text-white">
          新增成員
        </button>
      </form>

      <p className="text-sm text-gray-500">
        說明：需為此商戶的 owner/admin 才能新增成員。系統會以 email 查找現有使用者，找到後將其加入商戶。
      </p>
    </main>
  )
}