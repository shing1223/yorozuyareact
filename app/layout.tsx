// app/layout.tsx
import type { Metadata, Viewport } from "next"
import "./globals.css"
import RouteProgress from "@/components/RouteProgress"
import { Suspense } from "react"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://maxhse.com"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "萬事屋 MaxHse｜初創企業共同成長平台",
    template: "%s｜萬事屋 MaxHse",
  },
  description:
    "萬事屋 MaxHse 是面向初創、網店的成長平台，集合具潛力的品牌與商店，提供零門檻曝光、資源配對與聯合行銷，幫你快速起步並有效降低宣傳成本。",
  keywords: [
    "萬事屋", "MaxHse", "初創", "新創", "網店", "品牌成長", "行銷合作",
    "聯合行銷", "資源配對", "曝光平台", "創業", "電商"
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "萬事屋 MaxHse｜初創與網店的成長平台",
    description:
      "集合潛力品牌與商店，提供零門檻曝光、資源配對與聯合行銷，幫你快速起步並降低宣傳成本。",
    siteName: "萬事屋 MaxHse",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "萬事屋 MaxHse" }],
    locale: "zh-Hant",
  },
  twitter: {
    card: "summary_large_image",
    title: "萬事屋 MaxHse｜初創與網店的成長平台",
    description:
      "集合潛力品牌與商店，提供零門檻曝光、資源配對與聯合行銷，幫你快速起步並降低宣傳成本。",
    images: ["/og.png"],
  },
  alternates: {
    canonical: "/",
    languages: {
      "zh-Hant": "/",
      "en": "/en",
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "萬事屋 MaxHse",
  },
}

export const viewport: Viewport = {
  themeColor: "#ef4444",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <link rel="icon" href="/favicon.ico" sizes="32x32" />
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <div className="min-h-[100dvh] pb-[64px]" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}>
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          {children}
        </div>
        {/* 建議：網站層級 JSON-LD */}
        <script
          type="application/ld+json"
          // @ts-ignore
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "萬事屋 MaxHse",
              url: siteUrl,
              inLanguage: "zh-Hant",
              description:
                "萬事屋 MaxHse 是面向初創與網店的共同成長平台，集合具潛力的品牌與商店，提供零門檻曝光、資源配對與聯合行銷，幫你快速起步並有效降低宣傳成本。",
              potentialAction: {
                "@type": "SearchAction",
                target: `${siteUrl}/search?q={query}`,
                "query-input": "required name=query",
              },
              isAccessibleForFree: true,
            }),
          }}
        />
      </body>
    </html>
  )
}