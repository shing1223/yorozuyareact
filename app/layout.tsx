// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'IG 精選平台',
  description: '以商戶為單位，公開展示在後台勾選的 Instagram 貼文',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-white text-gray-900">{children}</body>
    </html>
  )
}