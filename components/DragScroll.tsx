"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  children: React.ReactNode
  className?: string
  /** 拖曳時暫時關閉 snap，避免卡卡感（預設 true） */
  disableSnapWhileDragging?: boolean
}

export default function DragScroll({
  children,
  className = "",
  disableSnapWhileDragging = true,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef<number | null>(null)
  const isDownRef = useRef(false)
  const startXRef = useRef(0)
  const startScrollLeftRef = useRef(0)
  const lastXRef = useRef(0)
  const lastTRef = useRef(0)
  const velRef = useRef(0) // px/ms
  const [dragging, setDragging] = useState(false)

  // 清理 rAF
  useEffect(() => () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }, [])

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    el.setPointerCapture?.(e.pointerId)

    isDownRef.current = true
    setDragging(true)

    startXRef.current = e.clientX
    startScrollLeftRef.current = el.scrollLeft
    lastXRef.current = e.clientX
    lastTRef.current = performance.now()
    velRef.current = 0

    // 讓拖曳更順：關閉 snap、避免被選字
    if (disableSnapWhileDragging) el.classList.add("snap-none")
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDownRef.current) return
    const el = ref.current
    if (!el) return

    const now = performance.now()
    const dx = e.clientX - startXRef.current

    // rAF 合批，避免頻繁 layout
    const step = () => {
      el.scrollLeft = startScrollLeftRef.current - dx
    }
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(step)

    // 計算瞬時速度（指標移動速度）
    const dt = Math.max(1, now - lastTRef.current) // ms
    const vx = (e.clientX - lastXRef.current) / dt // px/ms
    // 低通濾波，讓速度更穩定
    velRef.current = 0.8 * velRef.current + 0.2 * vx

    lastXRef.current = e.clientX
    lastTRef.current = now
  }

  const momentum = () => {
    const el = ref.current
    if (!el) return
    let v = velRef.current * 16 // 轉為每 frame 位移量（約 16ms/frame）
    const friction = 0.94
    const stop = 0.25 // 速度閾值

    const tick = () => {
      // 邊界防抖
      const prev = el.scrollLeft
      el.scrollLeft = prev - v
      const hitEdge = el.scrollLeft === prev

      v *= friction
      if (Math.abs(v) < stop || hitEdge) {
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    isDownRef.current = false
    setDragging(false)

    if (disableSnapWhileDragging) el.classList.remove("snap-none")
    document.body.style.userSelect = ""
    document.body.style.cursor = ""

    // 放手啟動動量滾動
    momentum()
    el.releasePointerCapture?.(e.pointerId)
  }

  const onPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDownRef.current) return
    onPointerUp(e)
  }

  return (
    <div
      ref={ref}
      // 重要：啟用水平手勢、慣性、與自己一層的合成層，滑動會更順
      className={[
        "relative flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar",
        "touch-pan-x select-none",      // 只允許水平手勢，避免瀏覽器打架
        dragging ? "cursor-grabbing" : "cursor-grab",
        "will-change-scroll",           // 讓瀏覽器預先最佳化
        className,
      ].filter(Boolean).join(" ")}
      style={{
        WebkitOverflowScrolling: "touch", // iOS 慣性
        contain: "layout paint style",    // 降低重排影響
        transform: "translateZ(0)",       // 合成層
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </div>
  )
}