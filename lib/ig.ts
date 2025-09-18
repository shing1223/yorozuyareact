export async function igGet<T = any>(path: string, token: string, q: Record<string,string> = {}) {
  const url = new URL(`https://graph.instagram.com/v23.0/${path}`)
  Object.entries(q).forEach(([k,v]) => url.searchParams.set(k, v))
  url.searchParams.set('access_token', token)
  const r = await fetch(url.toString())
  const j = await r.json().catch(()=> ({}))
  if (!r.ok) throw new Error(j?.error?.message || r.statusText)
  return j as T
}

export async function fetchIGMediaPages(params: { accessToken: string, after?: string }) {
  const { accessToken, after } = params
  const q: Record<string,string> = {
    fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{media_type,media_url}',
    limit: '50',
  }
  if (after) q.after = after
  return igGet('me/media', accessToken, q)
}