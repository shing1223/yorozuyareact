// components/DragScroll.tsx
"use client"

import { useRef, useState, PointerEvent, TouchEvent, HTMLAttributes } from "react"
import clsx from "clsx"

type Props = HTMLAttributes<HTMLDivElement> & {
  disableSnapWhileDragging?: boolean
  dragThresholdPx?: number
}

export default function DragScroll({
  className,
  children,
  disableSnapWhileDragging = true,
  dragThresholdPx = 6,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)

  // 共用狀態
  const startX = useRef(0)
  const startScroll = useRef(0)
  const moved = useRef(0)
  const suppressNextClick = useRef(false)

  // ===== Pointer 版 =====
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    setDragging(true)
    startX.current = e.clientX
    startScroll.current = el.scrollLeft
    moved.current = 0
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const el = ref.current
    if (!el) return
    const dx = e.clientX - startX.current
    moved.current = Math.max(moved.current, Math.abs(dx))
    el.scrollLeft = startScroll.current - dx
    e.preventDefault()
  }

  const endPointer = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging && moved.current > dragThresholdPx) suppressNextClick.current = true
    setDragging(false)
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  // ===== Touch 後備（部分行動裝置/瀏覽器）=====
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const t = e.touches[0]
    setDragging(true)
    startX.current = t.clientX
    startScroll.current = el.scrollLeft
    moved.current = 0
  }

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!dragging) return
    const el = ref.current
    if (!el) return
    const t = e.touches[0]
    const dx = t.clientX - startX.current
    moved.current = Math.max(moved.current, Math.abs(dx))
    el.scrollLeft = startScroll.current - dx
    e.preventDefault() // 阻止瀏覽器把手勢當成點擊或圖片拖動
  }

  const endTouch = () => {
    if (dragging && moved.current > dragThresholdPx) suppressNextClick.current = true
    setDragging(false)
  }

  // 捕獲階段吃掉拖曳造成的 click
  const onClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (suppressNextClick.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressNextClick.current = false
    }
  }

  return (
    <div
      ref={ref}
      // Pointer
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={(e) => dragging && endPointer(e as any)}
      // Touch fallback
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={endTouch}
      onTouchCancel={endTouch}
      // 點擊抑制
      onClickCapture={onClickCapture}
      // iOS 慣性滾動 + 手勢設定
      style={{ WebkitOverflowScrolling: "touch" as any }}
      className={clsx(
        // 橫向滾動/禁止 Y 溢出 + 慣性/避免邊界彈跳穿透
        "flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar overscroll-x-contain",
        // 行動裝置手勢：允許垂直 pan 交給瀏覽器、水平交給我們
        "touch-pan-y",
        // 拖曳中的指標/選取
        dragging ? "cursor-grabbing select-none" : "cursor-grab",
        // 拖曳時暫停 snap，放開再交回 snap
        disableSnapWhileDragging ? (dragging ? "snap-none" : "") : "",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}