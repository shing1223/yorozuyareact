// components/DragScroll.tsx
"use client"

import {
  useRef,
  useState,
  useCallback,
  type PointerEvent,
  type TouchEvent,
  type HTMLAttributes,
} from "react"
import clsx from "clsx"

type Props = HTMLAttributes<HTMLDivElement> & {
  disableSnapWhileDragging?: boolean
  dragThreshold?: number
  suppressClickMs?: number
}

export default function DragScroll({
  className,
  children,
  disableSnapWhileDragging = true,
  dragThreshold = 6,
  suppressClickMs = 250,
  ...rest
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null)

  const [isDown, setIsDown] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const startX = useRef(0)
  const startY = useRef(0)
  const startScroll = useRef(0)
  const suppressClickUntil = useRef(0)

  // ------ 通用邏輯 ------
  const begin = useCallback((x: number, y: number) => {
    const el = ref.current
    if (!el) return
    setIsDown(true)
    setIsDragging(false)
    startX.current = x
    startY.current = y
    startScroll.current = el.scrollLeft
  }, [])

  const moveBy = useCallback((x: number, y: number) => {
    if (!isDown) return
    const el = ref.current
    if (!el) return
    const dx = x - startX.current
    const dy = y - startY.current

    if (!isDragging && Math.abs(dx) > dragThreshold && Math.abs(dx) > Math.abs(dy)) {
      setIsDragging(true)
    }
    if (isDragging) {
      el.scrollLeft = startScroll.current - dx
    }
  }, [dragThreshold, isDown, isDragging])

  const end = useCallback(() => {
    if (isDragging) suppressClickUntil.current = Date.now() + suppressClickMs
    setIsDown(false)
    setIsDragging(false)
  }, [isDragging, suppressClickMs])

  // ------ Pointer（滑鼠 / 支援 Pointer 的裝置）------
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // 只對滑鼠做 pointer capture；觸控裝置不要（避免 iOS 卡住）
    if (e.pointerType === "mouse") {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    }
    begin(e.clientX, e.clientY)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDown) return
    moveBy(e.clientX, e.clientY)
    if (isDragging) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    }
    end()
  }

  // ------ Touch 後備（iOS / 部分 WebView 更穩）------
  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const t = e.touches[0]
    if (!t) return
    begin(t.clientX, t.clientY)
  }
  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!isDown) return
    const t = e.touches[0]
    if (!t) return
    moveBy(t.clientX, t.clientY)
    if (isDragging) {
      // 讓我們接手水平滑動
      e.preventDefault()
      e.stopPropagation()
    }
  }
  const onTouchEnd = () => end()

  // 抑制拖曳剛放手就觸發的 click（避免誤開 Link）
  const onClickCapture: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (Date.now() < suppressClickUntil.current) {
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
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onClickCapture={onClickCapture}
      // iOS 慣性滾動 + 允許垂直滾動，由我們接管水平
      style={{
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y", // 允許垂直，水平交給上面 handlers
      }}
      className={clsx(
        "flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar",
        isDragging ? "cursor-grabbing select-none" : "cursor-grab",
        disableSnapWhileDragging && isDragging ? "snap-none" : "",
        className
      )}
      // 防止原生 HTML5 drag 介入
      onDragStart={(e) => e.preventDefault()}
      {...rest}
    >
      {/* 建議：卡片內的 <img> 加 draggable={false} className="pointer-events-none select-none" */}
      {children}
    </div>
  )
}