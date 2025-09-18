// components/public/PublicFeed.tsx
import { getBaseUrl } from '@/lib/base-url'

type MediaItem = {
  ig_media_id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | string
  media_url: string
  permalink?: string
  caption?: string
  timestamp?: string
  thumbnail_url?: string | null
}

async function fetchFeed(slug: string, mock?: boolean) {
  if (mock) {
    // 假資料：方便尚未接好 API 時開發
    return {
      items: Array.from({ length: 8 }).map((_, i) => ({
        ig_media_id: `mock-${i}`,
        media_type: 'IMAGE',
        media_url: `https://picsum.photos/seed/${slug}-${i}/800/800`,
        permalink: '#',
        caption: `Mock 圖片 ${i + 1}`,
        timestamp: new Date().toISOString(),
        thumbnail_url: null,
      })),
    }
  }

  const base = await getBaseUrl()   // 👈 這裡要 await
  const res = await fetch(`${base}/api/public/feed/${slug}`, {
    next: { revalidate: 120 },
  })
  if (!res.ok) throw new Error('Failed to fetch public feed')
  return res.json() as Promise<{ items: any[] }>
}

export default async function PublicFeed({ slug, mock = false }: { slug: string; mock?: boolean }) {
  const data = await fetchFeed(slug, mock)
  const items = data.items ?? []

  if (!items.length) {
    return (
      <div className="text-gray-500">目前沒有公開的貼文。</div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((m) => (
        <a
          key={m.ig_media_id}
          href={m.permalink || '#'}
          target={m.permalink ? '_blank' : undefined}
          className="block border rounded overflow-hidden group"
        >
          <img
            src={m.thumbnail_url || m.media_url}
            alt={m.caption || ''}
            className="w-full aspect-square object-cover"
          />
          {m.caption && (
            <div className="p-2 text-sm line-clamp-2 group-hover:line-clamp-none">{m.caption}</div>
          )}
        </a>
      ))}
    </div>
  )
}