// lib/instagram.ts
export async function fetchIGMedia({
  accessToken,
  after,
  limit = 50,
}: {
  accessToken: string
  after?: string
  limit?: number
}) {
  const url = new URL('https://graph.instagram.com/v23.0/me/media')
  url.searchParams.set('fields', [
    'id',
    'caption',
    'media_type',
    'media_url',
    'permalink',
    'thumbnail_url',
    'timestamp',
    'children{media_url,media_type,id}',
  ].join(','))
  url.searchParams.set('limit', String(limit))
  if (after) url.searchParams.set('after', after)
  url.searchParams.set('access_token', accessToken)

  const r = await fetch(url.toString())
  const j = await r.json()
  if (!r.ok) throw new Error(j?.error?.message || r.statusText)
  return j as {
    data: any[]
    paging?: { cursors?: { after?: string } }
  }
}