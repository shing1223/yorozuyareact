// app/404.tsx (或 app/not-found.tsx)
"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function NotFoundInner() {
  const sp = useSearchParams()
  const from = sp.get("from")
  return (
    <main className="mx-auto max-w-[1080px] p-6">
      <h1 className="text-xl font-bold">找不到頁面</h1>
      {from && <p className="text-sm text-gray-500">from: {from}</p>}
      <Link href="/" className="text-blue-600 underline mt-4 inline-block">回首頁</Link>
    </main>
  )
}

export default function NotFound() {
  return (
    <Suspense fallback={null}>
      <NotFoundInner />
    </Suspense>
  )
}