'use client'

export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-2">載入失敗</h1>
      <p className="text-gray-600">{error.message}</p>
    </main>
  )
}