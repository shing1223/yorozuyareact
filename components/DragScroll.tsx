// components/DragScroll.tsx
"use client"

import { useRef, useState, PointerEvent, HTMLAttributes } from "react"
import clsx from "clsx"

type Props = HTMLAttributes<HTMLDivElement> & {
  // 可選：是否在拖曳時加上 no-snap（避免 snap 阻力感）
  disableSnapWhileDragging?: boolean
}

export default function DragScroll({
  className,
  children,
  disableSnapWhileDragging = true,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startScroll = useRef(0)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    setDragging(true)
    startX.current = e.clientX
    startScroll.current = el.scrollLeft
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const el = ref.current
    if (!el) return
    const dx = e.clientX - startX.current
    el.scrollLeft = startScroll.current - dx
    e.preventDefault() // 避免選字
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    setDragging(false)
    ;(e.target as Element).releasePointerCapture?.(e.pointerId)
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={clsx(
        // 基本：橫向捲動 + 禁止 Y 捲
        "flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar",
        // 滑鼠指標
        dragging ? "cursor-grabbing select-none" : "cursor-grab",
        // 拖曳時暫時關掉 snap（可選）
        disableSnapWhileDragging ? (dragging ? "snap-none" : "") : "",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}