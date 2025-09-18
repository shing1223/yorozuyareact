// app/(dashboard)/layout.tsx
import type { ReactNode } from 'react'
import UserBar from './_components/UserBar'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-5xl flex items-center justify-between p-4">
          <a href="/dashboard" className="font-semibold">後台</a>
          <UserBar />
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {children}
      </main>
    </div>
  )
}