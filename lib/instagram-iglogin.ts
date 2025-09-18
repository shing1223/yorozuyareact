// lib/instagram-iglogin.ts（新流程版）
export async function fetchIGLoginMedia(params: {
  accessToken: string
  igUserId: string
  after?: string
}) {
  const { accessToken, igUserId, after } = params
  const url = new URL(`https://graph.instagram.com/v23.0/${igUserId}/media`)
  url.searchParams.set('fields', [
    'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}'
  ].join(','))
  url.searchParams.set('access_token', accessToken)
  if (after) url.searchParams.set('after', after)

  const r = await fetch(url.toString())
  const j = await r.json()
  if (!r.ok) throw new Error(j?.error?.message || r.statusText)
  return j as {
    data: any[]
    paging?: { cursors?: { after?: string } }
  }
}