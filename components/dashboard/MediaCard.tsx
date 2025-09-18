'use client'

export default function MediaCard({ m, selected, toggle }: { m: any; selected: boolean; toggle: () => void }) {
  return (
    <button onClick={toggle} className={`border rounded overflow-hidden text-left ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <img src={m.thumbnail_url || m.media_url} alt={m.caption || ''} className="w-full aspect-square object-cover" />
      <div className="p-2 text-sm line-clamp-2">{m.caption}</div>
    </button>
  )
}