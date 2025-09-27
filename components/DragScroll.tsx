// components/DragScroll.tsx
"use client"

import { useRef, useState, PointerEvent, HTMLAttributes } from "react"
import clsx from "clsx"

type Props = HTMLAttributes<HTMLDivElement> & {
  disableSnapWhileDragging?: boolean
  dragThresholdPx?: number // 觸發「拖曳而非點擊」的門檻（預設 6px）
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
  const startX = useRef(0)
  const startScroll = useRef(0)
  const moved = useRef(0)
  const suppressNextClick = useRef(false) // ← 拖曳後抑制下一次 click

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
    e.preventDefault() // 避免選字/拖曳影像
  }

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging && moved.current > dragThresholdPx) {
      // 這次操作屬於拖曳，不是點擊 → 阻擋下一次 click
      suppressNextClick.current = true
    }
    setDragging(false)
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  // 關鍵：在捕獲階段吃掉 click
  const onClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (suppressNextClick.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressNextClick.current = false // 只吃掉這一次
    }
  }

  // 避免圖片被原生拖曳
  const onDragStart: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={(e) => dragging && endDrag(e as any)}
      onClickCapture={onClickCapture}
      onDragStart={onDragStart}
      className={clsx(
        "flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar touch-pan-y",
        dragging ? "cursor-grabbing select-none" : "cursor-grab",
        disableSnapWhileDragging ? (dragging ? "snap-none" : "") : "",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}