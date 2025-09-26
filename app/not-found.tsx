// app/not-found.tsx  (Server Component，無任何 useSearchParams)
export default function NotFound() {
  return (
    <main className="mx-auto max-w-[720px] p-6">
      <h1 className="text-2xl font-bold">找不到頁面</h1>
      <p className="mt-2 text-gray-600">您要找的頁面不存在或已被移除。</p>
      <a href="/" className="mt-4 inline-block text-blue-600 underline">回到首頁</a>
    </main>
  )
}