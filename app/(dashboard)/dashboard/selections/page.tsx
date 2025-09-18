'use client'
import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabaseBrowser'

export default function SelectionsPage() {
  const supabase = createSupabaseBrowser()
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('media_selection')
        .select('id, is_pinned, order_index, ig_media(*)')
        .order('is_pinned', { ascending: false })
        .order('order_index', { ascending: true, nullsFirst: false })
      setItems(data ?? [])
    })()
  }, [])

  async function removeSelection(id: string) {
    await supabase.from('media_selection').delete().eq('id', id)
    setItems((cur) => cur.filter((x) => x.id !== id))
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">已勾選清單</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map((row) => (
          <div key={row.id} className="border rounded overflow-hidden">
            <img src={row.ig_media.thumbnail_url || row.ig_media.media_url} alt={row.ig_media.caption || ''} className="w-full aspect-square object-cover" />
            <div className="p-2 space-y-2">
              <div className="text-sm line-clamp-2">{row.ig_media.caption}</div>
              <div className="flex gap-2">
                <button className="px-3 py-1 border rounded" onClick={() => removeSelection(row.id)}>移除</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}