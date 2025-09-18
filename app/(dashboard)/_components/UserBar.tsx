// app/(dashboard)/_components/UserBar.tsx
'use client'

import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function UserBar() {
  const supabase = createSupabaseBrowser()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null)
    })
    return () => { active = false }
  }, [supabase])

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600">{email ?? '未登入'}</span>
      <button
        className="px-3 py-1 border rounded"
        onClick={async () => {
          await supabase.auth.signOut()
          window.location.href = '/login'
        }}
      >
        登出
      </button>
    </div>
  )
}