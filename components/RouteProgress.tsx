"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export default function RouteProgress() {
  const pathname = usePathname()
  const search = useSearchParams()
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<number | null>(null)

  // 當 URL（路徑或 query）改變 → 顯示進度條，延遲關閉以避免閃爍
  useEffect(() => {
    // 開始
    setLoading(true)
    // 結束（下一幀 + 小延遲，讓動畫有時間播放）
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setLoading(false), 100)
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search?.toString()])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[9999]"
    >
      <div
        className={[
          "h-0.5 w-full origin-left scale-x-0 bg-black/80",
          "transition-transform duration-300",
          loading ? "scale-x-100" : "scale-x-0",
        ].join(" ")}
      />
    </div>
  )
}