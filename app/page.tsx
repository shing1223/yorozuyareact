// app/page.tsx
import Link from 'next/link'

export const revalidate = 60

export default async function Home() {
  // 這裡可以改成從 DB 拉商戶列表，或直接放靜態連結
  const merchants = [
    { name: 'Demo 商戶', slug: 'demo' },
  ]

  return (
        <main className="mx-auto max-w-4xl p-6 space-y-4">
      <div className="flex gap-3">
        <Link href="/login" className="px-3 py-1 border rounded">登入</Link>
        <Link href="/dashboard" className="px-3 py-1 border rounded">後台</Link>
      </div>
      <h1 className="text-3xl font-bold">Instagram 精選平台</h1>
      <p className="text-gray-600">到以下商戶頁面，查看各自公開的 IG 精選貼文牆：</p>
      <ul className="list-disc pl-6 space-y-2">
        {merchants.map((m) => (
          <li key={m.slug}>
            <Link className="text-blue-600 underline" href={`/${m.slug}`}>{m.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  )
}