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

  // 僅用於「滑鼠」的拖曳
  const [draggingMouse, setDraggingMouse] = useState(false)
  const isDown = useRef(false)
  const startX = useRef(0)
  const startScroll = useRef(0)
  const movedHoriz = useRef(false)
  const pointerIdRef = useRef<number | null>(null)

  // 手機/觸控用：只要最近剛捲動過，就先擋掉 click
  const lastScrollAt = useRef(0)

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return

    if (e.pointerType === "mouse") {
      isDown.current = true
      movedHoriz.current = false
      startX.current = e.clientX
      startScroll.current = el.scrollLeft
      pointerIdRef.current = e.pointerId
      ;(e.target as Element).setPointerCapture?.(e.pointerId)
      setDraggingMouse(true)
    }
    // 觸控/手寫筆：不做任何事，交給瀏覽器原生捲動
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!isDown.current || e.pointerType !== "mouse") return
    const el = ref.current
    if (!el) return
    const dx = e.clientX - startX.current
    if (Math.abs(dx) >= dragThresholdPx) movedHoriz.current = true
    el.scrollLeft = startScroll.current - dx
    e.preventDefault() // 只在滑鼠拖曳時阻止預設
  }

  const finishPointer = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") {
      isDown.current = false
      if (pointerIdRef.current != null) {
        ;(e.target as Element).releasePointerCapture?.(pointerIdRef.current)
        pointerIdRef.current = null
      }
      setDraggingMouse(false)
      // 留一小段時間擋掉隨後的 click
      setTimeout(() => {
        movedHoriz.current = false
      }, 80)
    }
  }, [])

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => finishPointer(e)
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => finishPointer(e)

  const onScroll = () => {
    // 任何裝置的原生/程式捲動都會更新時間戳
    lastScrollAt.current = Date.now()
  }

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickOnDrag) return
    const scrolledRecently = Date.now() - lastScrollAt.current < 150
    if (movedHoriz.current || scrolledRecently) {
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
      onScroll={onScroll}
      onClickCapture={onClickCapture}
      // 允許瀏覽器處理觸控橫/縱向捲動；滑鼠拖曳由上面邏輯控制
      style={{ touchAction: "pan-x pan-y" }}
      className={clsx(
        // 橫向列表 + 隱藏滾動條（仍保留原生觸控捲動）
        "flex gap-4 overflow-x-auto overflow-y-hidden no-scrollbar",
        // 選字關閉避免拖曳時選到文字
        "select-none",
        // 滑鼠指標
        draggingMouse ? "cursor-grabbing" : "cursor-grab",
        // 只在滑鼠拖曳時暫停 snap，手機原生捲動不受影響
        disableSnapWhileDragging ? (draggingMouse ? "snap-none" : "") : "",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}