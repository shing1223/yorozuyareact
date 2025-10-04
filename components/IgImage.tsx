// components/IgImage.tsx
"use client"

import { useState } from "react"

const FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'>
       <rect width='100%' height='100%' fill='#eee'/>
       <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle'
             font-family='system-ui, sans-serif' font-size='14' fill='#888'>
         image unavailable
       </text>
     </svg>`
  )

type Props = {
  src: string
  thumb?: string
  alt?: string
  className?: string
}

export default function IgImage({ src, thumb, alt = "", className }: Props) {
  const [cur, setCur] = useState(src)
  return (
    <img
      src={cur}
      alt={alt}
      className={className}
      loading="lazy"
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => {
        if (thumb && cur !== thumb) setCur(thumb)
        else if (cur !== FALLBACK) setCur(FALLBACK)
      }}
    />
  )
}