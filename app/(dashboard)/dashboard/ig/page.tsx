'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabaseBrowser'
import MediaCard from '@/components/dashboard/MediaCard'

export default function IGPickerPage() {
  const supabase = createSupabaseBrowser()
  const [media, setMedia] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('ig_media').select('*').order('timestamp', { ascending: false }).limit(200)
      setMedia(data ?? [])
    })()
  }, [])

  async function applySelections() {
    const merchantId = (await supabase.from('membership').select('merchant_id').limit(1)).data?.[0]?.merchant_id
    if (!merchantId) return
    const rows = Array.from(selected).map((uuid) => ({ merchant_id: merchantId, ig_media_id: uuid }))
    await supabase.from('media_selection').upsert(rows, { onConflict: 'merchant_id,ig_media_id' })
    alert('已加入公開清單')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">IG 貼文同步與勾選</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {media.map((m) => {
          const isSel = selected.has(m.id)
          return (
            <MediaCard key={m.id} m={m} selected={isSel} toggle={() => {
              const next = new Set(selected)
              isSel ? next.delete(m.id) : next.add(m.id)
              setSelected(next)
            }} />
          )
        })}
      </div>
      <div className="pt-2">
        <button onClick={applySelections} className="px-4 py-2 rounded bg-black text-white">加入公開清單</button>
      </div>
    </div>
  )
}