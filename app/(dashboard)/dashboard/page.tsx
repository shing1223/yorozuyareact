// app/(dashboard)/dashboard/page.tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function DashboardHome() {
  const supabase = await createSupabaseServer()

  // ✅ 改用 getUser 做伺服端驗證
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    redirect('/login?redirect=/dashboard')
  }

  // 僅允許 owner 進入
  const { data: ownerMembership, error: memErr } = await supabase
    .from('membership')
    .select('merchant_id, role')
    .eq('user_id', user.id)      // ✅ 這裡改成 user.id
    .eq('role', 'owner')
    .maybeSingle()

  if (!ownerMembership || memErr) {
    redirect('/?noaccess=dashboard')
  }

  const merchant = String(ownerMembership.merchant_id || '')
    .trim()
    .toLowerCase()

  // 下面所有查詢都用 owner 的 merchant
  const { data: acct } = await supabase
    .from('ig_account')
    .select('ig_username, ig_user_id')
    .eq('merchant_slug', merchant)
    .maybeSingle()

  const { data: medias } = await supabase
    .from('ig_media')
    .select('ig_media_id, media_type, media_url, thumbnail_url, caption, timestamp')
    .eq('merchant_slug', merchant)
    .order('timestamp', { ascending: false })
    .limit(60)

  const { data: sel } = await supabase
    .from('media_selection')
    .select('ig_media_id, is_published')
    .eq('merchant_slug', merchant)

  const publishedMap = new Map<string, boolean>(
    (sel ?? []).map((s) => [String(s.ig_media_id), !!s.is_published])
  )

  const { data: binds } = await supabase
    .from('media_product')
    .select('ig_media_id, product:product_id(id, title, price, currency)')
    .eq('merchant_slug', merchant)

  type ProductLite = {
    id?: string | null
    title?: string | null
    price?: number | null
    currency?: string | null
  }

  const productMap = new Map<string, ProductLite>()
  ;(binds ?? []).forEach((b: any) => {
    const p = Array.isArray(b.product) ? b.product[0] : b.product
    productMap.set(String(b.ig_media_id), {
      id: p?.id ?? null,
      title: p?.title ?? null,
      price: p?.price ?? null,
      currency: p?.currency ?? null,
    })
  })

  return (
    <div className="space-y-6">
      {/* Header + Actions */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">後台總覽</h1>

        <Link
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-white hover:opacity-90"
        >
          查看訂單
        </Link>
      </div>

      {!acct ? (
        <div className="space-y-3">
          <p>尚未連結 Instagram。</p>
          <a
            href={`/api/ig/auth?merchant=${merchant}`}
            className="inline-flex items-center px-4 py-2 rounded bg-black text-white"
          >
            連結 Instagram
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <p>
            已連結 IG：<b>@{acct.ig_username}</b>
          </p>
          <form action={`/api/ig/sync?merchant=${merchant}`} method="post">
            <input type="hidden" name="merchant" value={merchant} />
            <button className="px-3 py-1 border rounded">同步最新媒體</button>
          </form>
        </div>
      )}

      {/* 收款設定（Stripe Connect） */}
<section className="space-y-3 rounded border p-4">
  <h2 className="text-lg font-medium">收款設定</h2>

  {/* 從 merchants 取出 stripe 狀態 */}
  {/*
    你也可以先在上面那段 SSR 查詢 merchants 的 stripe_* 欄位，
    這裡為簡潔起見，用「快速方案」：讓使用者直接點連結，
    連線成功返回 /dashboard?stripe=connected
  */}
  <div className="space-y-2">
    <a
      href={`/api/stripe/connect/start?merchant=${merchant}`}
      className="inline-flex items-center rounded bg-black px-3 py-2 text-white hover:opacity-90"
    >
      連結 Stripe（Express）
    </a>

    <div className="text-sm text-gray-500">
      已連線的商戶可使用：
      <a
        href={`/api/stripe/connect/login?merchant=${merchant}`}
        className="ml-1 underline"
      >
        開啟 Stripe 商家後台
      </a>
      ．若未完成認證，系統會引導你繼續。
    </div>
  </div>
</section>

      <section className="space-y-2">
        <h2 className="text-lg font-medium">媒體清單（勾選發佈 & 設定價格）</h2>

        {!medias?.length ? (
          <p className="text-gray-500">尚無資料，先點「同步最新媒體」。</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {medias.map((m) => (
              <MediaCard
                key={m.ig_media_id}
                m={m}
                merchant={merchant}
                published={publishedMap.get(m.ig_media_id) ?? false}
                product={productMap.get(m.ig_media_id) ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function firstLine(text?: string | null) {
  if (!text) return ''
  const line = text.split('\n').map((s) => s.trim()).find(Boolean)
  return line ?? ''
}

function MediaCard({
  m,
  merchant,
  published,
  product,
}: {
  m: any
  merchant: string
  published: boolean
  product: { id?: string | null; title?: string | null; price?: number | null; currency?: string | null } | null
}) {
  const img = m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url) : m.media_url
  const baseTitle = firstLine(m.caption)
  const suggestedTitle = (product?.title ?? baseTitle) || `商品：${String(m.ig_media_id).slice(-6)}`

  return (
    <div className="border rounded overflow-hidden">
      <div className="relative">
        {!!published && (
          <span className="absolute top-2 left-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
            已發佈
          </span>
        )}
        <img src={img || undefined} alt="" className="w-full aspect-square object-cover" />
      </div>

      <div className="p-2 text-sm space-y-2">
        <div className="line-clamp-2">{m.caption ?? ''}</div>

        {/* 切換發佈 */}
        <form action="/api/dashboard/toggle" method="post" className="space-y-2">
          <input type="hidden" name="merchant" value={merchant} />
          <input type="hidden" name="ig_media_id" value={m.ig_media_id} />
          <button className="w-full px-2 py-1 border rounded">
            {published ? '取消發佈' : '設定為發佈'}
          </button>
        </form>

        {/* 設定價格（最小表單） */}
        <form action="/api/dashboard/product" method="post" className="space-y-2 pt-2 border-t">
          <input type="hidden" name="merchant" value={merchant} />
          <input type="hidden" name="ig_media_id" value={m.ig_media_id} />
          <input type="hidden" name="image_url" value={img} />

          <input
            name="title"
            defaultValue={suggestedTitle}
            placeholder="商品標題"
            className="w-full border px-2 py-1 rounded"
          />

          <div className="flex gap-2">
            <input
              name="price"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.price ?? ''}
              placeholder="價格"
              className="w-full border px-2 py-1 rounded"
              required
            />
            <select
              name="currency"
              defaultValue={(product?.currency ?? 'HKD') as string}
              className="w-28 border px-2 py-1 rounded"
              required
            >
              <option value="HKD">HKD</option>
              <option value="TWD">TWD</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <button className="w-full px-2 py-1 rounded bg-black text-white">
            {product?.price != null ? '更新價格' : '儲存價格'}
          </button>
        </form>

        {product?.price != null && (
          <div className="text-xs text-gray-600">
            目前售價：{product?.currency ?? 'HKD'} {Number(product?.price).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}