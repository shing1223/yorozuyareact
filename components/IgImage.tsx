// components/IgImage.tsx
"use client"

import { useState, useEffect } from "react"

type Props = {
  src: string            // 代理後的大圖
  thumb?: string         // 備援縮圖（也建議用代理）
  alt?: string
  className?: string
  fallback?: string      // 最後的 data: 占位圖
}

export default function IgImage({ src, thumb, alt = "", className, fallback }: Props) {
  const [url, setUrl] = useState(src)

  useEffect(() => { setUrl(src) }, [src])

  return (
    // 注意：這是 client component，onError 合法
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => {
        if (thumb && url !== thumb) {
          setUrl(thumb)         // 先退縮圖
        } else if (fallback && url !== fallback) {
          setUrl(fallback)      // 再退占位圖
        }
      }}
    />
  )
}