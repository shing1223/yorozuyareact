// components/DragScroll.tsx
"use client"

import { useRef, useState, useMemo, type PointerEvent, type HTMLAttributes } from "react"
import clsx from "clsx"

type Props = HTMLAttributes<HTMLDivElement> & {
  /** 拖曳時暫停 snap，避免「卡格」感（預設 true） */
  disableSnapWhileDragging?: boolean
  /** 拖曳改變超過幾 px 視為拖曳（而非點擊） */
  dragThreshold?: number
  /** 拖曳後抑制 click 的毫秒數（避免誤觸） */
  suppressClickMs?: number
}

export default function DragScroll({
  className,
  children,
  disableSnapWhileDragging = true,
  dragThreshold = 5,
  suppressClickMs = 250,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  // 內部狀態
  const [isPointerDown, setIsPointerDown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // 暫存資料
  const startX = useRef(0)
  const startY = useRef(0)
  const startScroll = useRef(0)
  const lastDeltaX = useRef(0)
  const suppressClickUntil = useRef(0)

  const handlers = useMemo(() => {
    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
      const el = ref.current
      if (!el) return

      setIsPointerDown(true)
      setIsDragging(false) // 還不知道是不是拖曳，先當成點擊

      startX.current = e.clientX
      startY.current = e.clientY
      startScroll.current = el.scrollLeft
      lastDeltaX.current = 0

      // 圖片/連結不要被瀏覽器拖動
      ;(e.target as HTMLElement)?.setPointerCapture?.(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
      if (!isPointerDown) return
      const el = ref.current
      if (!el) return

      const dx = e.clientX - startX.current
      const dy = e.clientY - startY.current

      // 超過門檻才進入「拖曳」狀態（避免微小抖動被當成拖曳）
      if (!isDragging && Math.abs(dx) > dragThreshold && Math.abs(dx) > Math.abs(dy)) {
        setIsDragging(true)
      }

      if (isDragging) {
        el.scrollLeft = startScroll.current - dx
        lastDeltaX.current = dx
        // 重要：阻止選字/點擊/瀏覽器手勢
        e.preventDefault()
        e.stopPropagation()
      }
    }

    const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
      if (isDragging) {
        // 剛剛有拖曳過 → 在短時間內抑制 click
        suppressClickUntil.current = Date.now() + suppressClickMs
      }
      setIsPointerDown(false)
      setIsDragging(false)
      ;(e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId)
    }

    const onClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
      // 在抑制期間阻止 click 往下冒泡到 Link
      if (Date.now() < suppressClickUntil.current) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture }
  }, [dragThreshold, suppressClickMs, isPointerDown, isDragging])

  return (
    <div
      ref={ref}
      // 讓我們自己的 PointerEvents 處理水平拖曳；仍允許垂直滾動（pan-y）
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" as any }}
      {...handlers}
      className={clsx(
        // 橫向列表 + 關閉 Y 捲動
        "flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar",
        // 拖曳指標 & 避免選字
        isDragging ? "cursor-grabbing select-none" : "cursor-grab",
        // 拖曳時暫時關掉 snap（更順滑）
        disableSnapWhileDragging && isDragging ? "snap-none" : "",
        className
      )}
      {...rest}
    >
      {/* 建議：子元素中的 <img> 一律加 draggable={false}、pointer-events-none，避免干擾 */}
      {children}
    </div>
  )
}