// components/DragScroll.tsx
"use client"

import { useRef, useState, PointerEvent, HTMLAttributes, useCallback } from "react"
import clsx from "clsx"

type Props = HTMLAttributes<HTMLDivElement> & {
  disableSnapWhileDragging?: boolean
  // 是否在「拖過門檻」時攔截 click（預設開啟）
  suppressClickOnDrag?: boolean
  // 多少像素視為拖曳（避免微小抖動誤判）
  dragThresholdPx?: number
}

export default function DragScroll({
  className,
  children,
  disableSnapWhileDragging = true,
  suppressClickOnDrag = true,
  dragThresholdPx = 6,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startScroll = useRef(0)
  const moved = useRef(false) // 是否已超過門檻
  const pointerIdRef = useRef<number | null>(null)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    setDragging(true)
    moved.current = false
    startX.current = e.clientX
    startScroll.current = el.scrollLeft
    pointerIdRef.current = e.pointerId
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const el = ref.current
    if (!el) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) >= dragThresholdPx) {
      moved.current = true
    }
    el.scrollLeft = startScroll.current - dx
    e.preventDefault() // 避免選字/觸發其他手勢
  }

  const finishPointer = useCallback((e: PointerEvent<HTMLDivElement>) => {
    setDragging(false)
    // 釋放指標捕捉
    if (pointerIdRef.current != null) {
      ;(e.target as Element).releasePointerCapture?.(pointerIdRef.current)
      pointerIdRef.current = null
    }
    // 注意：不要立刻清掉 moved.current，因為 click 會在 pointerup 之後觸發
    // 延遲清空，讓 onClickCapture 有機會判斷
    setTimeout(() => {
      moved.current = false
    }, 80)
  }, [])

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => finishPointer(e)
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => finishPointer(e)

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    // 若剛剛有拖曳過門檻，就攔截這次 click，避免 Link 導覽
    if (suppressClickOnDrag && moved.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClickCapture={onClickCapture}
      // touch-action 設為 pan-y，讓垂直滾動交給瀏覽器、水平由我們處理
      style={{ touchAction: "pan-y" }}
      className={clsx(
        "flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
        disableSnapWhileDragging ? (dragging ? "snap-none" : "") : "",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}