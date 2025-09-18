// app/(public)/[slug]/page.tsx
import type { Metadata } from 'next'
import PublicFeed from '@/components/public/PublicFeed'

export const revalidate = 60

export default async function MerchantPublicPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  // mock 開關：尚未接好 API 時可設為 true
  const mock = false

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{slug} 的 Instagram 精選</h1>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <PublicFeed slug={slug} mock={mock} />
    </main>
  )
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { slug } = params
  return {
    title: `${slug} 的 IG 精選牆`,
    description: `查看 ${slug} 在後台勾選後公開的 Instagram 貼文。`,
    openGraph: {
      title: `${slug} 的 IG 精選牆`,
      description: `查看 ${slug} 在後台勾選的 Instagram 貼文。`,
      url: `/${slug}`,
      type: 'website',
    },
  }
}