'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

export default function MerchantSwitcher() {
  const supabase = createSupabaseBrowser()
  const [items, setItems] = useState<{ slug: string; name: string }[]>([])
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('membership').select('merchant:merchant_id(slug, name)')
      const rows = (data ?? []).map((r: any) => r.merchant)
      setItems(rows)
      const stored = localStorage.getItem('merchant_slug')
      if (stored) setActive(stored)
      else if (rows[0]) setActive(rows[0].slug)
    })()
  }, [])

  useEffect(() => {
    if (active) localStorage.setItem('merchant_slug', active)
  }, [active])

  return (
    <div>
      <label className="text-sm text-gray-500">商戶</label>
      <select
        className="mt-1 w-full border rounded p-2"
        value={active ?? ''}
        onChange={(e) => setActive(e.target.value)}
      >
        {items.map((m) => (
          <option key={m.slug} value={m.slug}>{m.name}</option>
        ))}
      </select>
    </div>
  )
}