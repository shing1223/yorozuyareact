// components/DragScroll.tsx
"use client"

import { useRef, useState, PointerEvent, HTMLAttributes, useCallback } from "react"
import clsx from "clsx"

type Props = HTMLAttributes<HTMLDivElement> & {
  disableSnapWhileDragging?: boolean
  suppressClickOnDrag?: boolean
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
  const [draggingX, setDraggingX] = useState(false) // 只有「水平拖曳中」才為 true
  const isDown = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startScroll = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const movedHoriz = useRef(false) // 用來抑制 click（只在水平拖曳成立時）

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    isDown.current = true
    setDraggingX(false)
    movedHoriz.current = false
    startX.current = e.clientX
    startY.current = e.clientY
    startScroll.current = el.scrollLeft
    pointerIdRef.current = e.pointerId
    // 不要立刻 setPointerCapture；等確定是水平拖曳再抓
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDown.current) return
    const el = ref.current
    if (!el) return

    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current

    // 尚未決定方向：判定使用者意圖
    if (!draggingX) {
      // 使用者往下/上滑而且幅度大於橫向 → 讓瀏覽器處理（不 preventDefault）
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) >= 4) {
        // 放棄水平拖曳判定
        return
      }
      // 橫向超過門檻，且大於縱向 → 啟動水平拖曳
      if (Math.abs(dx) >= dragThresholdPx && Math.abs(dx) > Math.abs(dy)) {
        setDraggingX(true)
        movedHoriz.current = true
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
      } else {
        return
      }
    }

    // 已在水平拖曳：更新 scroll，阻止預設避免頁面跟著動
    el.scrollLeft = startScroll.current - dx
    e.preventDefault()
  }

  const finishPointer = useCallback((e: PointerEvent<HTMLDivElement>) => {
    isDown.current = false
    // 釋放指標捕捉（若有）
    if (pointerIdRef.current != null) {
      ;(e.target as Element).releasePointerCapture?.(pointerIdRef.current)
      pointerIdRef.current = null
    }
    // 拖曳結束後稍微保留 movedHoriz 用於攔截隨後的 click
    setTimeout(() => {
      movedHoriz.current = false
    }, 80)
    setDraggingX(false)
  }, [])

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => finishPointer(e)
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => finishPointer(e)

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressClickOnDrag && movedHoriz.current) {
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
      // 僅宣告 pan-y：讓瀏覽器自由處理縱向滾動；我們只在「已判定為水平拖曳」時阻止預設
      style={{ touchAction: "pan-y" }}
      className={clsx(
        "flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar select-none",
        draggingX ? "cursor-grabbing" : "cursor-grab",
        disableSnapWhileDragging ? (draggingX ? "snap-none" : "") : "",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}