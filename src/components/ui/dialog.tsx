"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Copy, Square, XIcon } from "lucide-react"

type ResizeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"
type DragMode = "move" | ResizeDir

interface FloatRect {
  left: number
  top: number
  width: number
  height: number
}

const MIN_FLOAT_WIDTH = 360
const MIN_FLOAT_HEIGHT = 240

/** Drag-to-move (from the header) and drag-to-resize (from any edge/corner) for a
 *  `maximizable` DialogContent — entirely self-contained (position/size live only here,
 *  never exposed to callers) since every caller already resets to a fresh centered dialog
 *  on close by virtue of Radix unmounting DialogPrimitive.Content when `open` goes false.
 *  Returns null (meaning "use the default centered/max-w-* CSS") until the user actually
 *  drags or resizes at least once. */
function useFloatingDialog(contentRef: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const [rect, setRect] = useState<FloatRect | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; start: FloatRect; mode: DragMode } | null>(null)

  useEffect(() => {
    if (!enabled) return
    function onMove(e: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      const { start, mode } = drag
      let { left, top, width, height } = start
      if (mode === "move") {
        left = start.left + dx
        top = start.top + dy
      } else {
        if (mode.includes("e")) width = Math.max(MIN_FLOAT_WIDTH, start.width + dx)
        if (mode.includes("s")) height = Math.max(MIN_FLOAT_HEIGHT, start.height + dy)
        if (mode.includes("w")) {
          width = Math.max(MIN_FLOAT_WIDTH, start.width - dx)
          left = start.left + (start.width - width)
        }
        if (mode.includes("n")) {
          height = Math.max(MIN_FLOAT_HEIGHT, start.height - dy)
          top = start.top + (start.height - height)
        }
      }
      // Keep at least a grabbable sliver on-screen rather than letting the whole dialog
      // (title bar included) drag past an edge and become unreachable.
      left = Math.min(Math.max(left, 80 - width), window.innerWidth - 80)
      top = Math.min(Math.max(top, 0), window.innerHeight - 48)
      setRect({ left, top, width, height })
    }
    function onUp() {
      dragRef.current = null
      document.body.style.userSelect = ""
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [enabled])

  function begin(e: React.PointerEvent, mode: DragMode) {
    if (!enabled) return
    const el = contentRef.current
    if (!el) return
    const box = el.getBoundingClientRect()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      start: { left: box.left, top: box.top, width: box.width, height: box.height },
      mode,
    }
    // Captured on the CONTENT root, not e.currentTarget (a resize handle, for the resize
    // modes) — capturing on a small non-focusable handle div reproduced the exact same
    // close-on-pointerup Radix issue described below, capturing on the content root did
    // not. NOT e.preventDefault() here either — Radix's Dialog relies on this pointerdown's
    // default focus handling internally; blocking it was confusing its own focus-outside
    // dismissal logic into treating the drag as focus escaping the dialog, closing it
    // mid-drag (reproduced: survived pointerdown and pointermove, closed exactly on
    // pointerup). document.body's user-select is enough to stop text-selection instead.
    el.setPointerCapture(e.pointerId)
    document.body.style.userSelect = "none"
  }

  return { rect, resetRect: () => setRect(null), begin }
}

const RESIZE_HANDLES: { dir: ResizeDir; className: string }[] = [
  { dir: "n", className: "inset-x-2 top-0 h-1.5 cursor-ns-resize" },
  { dir: "s", className: "inset-x-2 bottom-0 h-1.5 cursor-ns-resize" },
  { dir: "w", className: "inset-y-2 left-0 w-1.5 cursor-ew-resize" },
  { dir: "e", className: "inset-y-2 right-0 w-1.5 cursor-ew-resize" },
  { dir: "nw", className: "left-0 top-0 size-3 cursor-nwse-resize" },
  { dir: "se", className: "right-0 bottom-0 size-3 cursor-nwse-resize" },
  { dir: "ne", className: "right-0 top-0 size-3 cursor-nesw-resize" },
  { dir: "sw", className: "left-0 bottom-0 size-3 cursor-nesw-resize" },
]

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  maximizable = false,
  maximized = false,
  onMaximizedChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  /** Adds a window-style maximize/restore toggle next to the close button, so the dialog
   *  can fill the viewport (like maximizing a desktop window) and snap back to its normal
   *  auto-fit size — the caller owns `maximized` state (and typically resets it to false
   *  on close, so the sheet reopens at its normal size next time). */
  maximizable?: boolean
  maximized?: boolean
  onMaximizedChange?: (v: boolean) => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const floatingEnabled = maximizable && !maximized
  const { rect, resetRect, begin } = useFloatingDialog(contentRef, floatingEnabled)

  // Restoring from maximized (or the caller maximizing it) drops back to the default
  // centered/max-w-* CSS rather than reopening at whatever size it was floating at before
  // — matches "Restore down" reading as "back to normal", not "back to my last drag".
  useEffect(() => {
    if (maximized) resetRect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maximized])

  const floatStyle: React.CSSProperties | undefined =
    rect && floatingEnabled
      ? {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          maxWidth: "none",
          maxHeight: "none",
          transform: "none",
          // Tailwind v4's -translate-x-1/2/-translate-y-1/2 (centering) compile to the
          // standalone CSS `translate` property, not `transform` — resetting only
          // `transform` left the centering offset still applied on top of the new
          // left/top, so the dialog rendered at left/top MINUS half its own size instead
          // of at left/top itself. Verified via computed style: `translate: -50% -50%`
          // survived `transform: none` entirely.
          translate: "0",
        }
      : undefined

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={contentRef}
        data-slot="dialog-content"
        data-draggable={floatingEnabled || undefined}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-2xl ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
          maximized &&
            "inset-2 top-2 left-2 h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100dvw-1rem)] max-w-[calc(100dvw-1rem)] translate-x-0 translate-y-0 sm:max-w-[calc(100dvw-1rem)]"
        )}
        style={floatStyle}
        onPointerDownCapture={(e) => {
          // Routed through this ONE capture-phase handler on the content root for both
          // move and resize (rather than each resize handle also carrying its own
          // onPointerDown) — a handle's own bubble-phase handler reproduced the same
          // close-on-pointerup Radix issue the header case hit before it was moved here,
          // even after matching everything else (capture target, no preventDefault).
          // Whatever Radix's focus-outside detection is keying off, going through capture
          // on the content root is what it doesn't misread as focus leaving the dialog.
          if (!floatingEnabled) return
          const target = e.target as HTMLElement
          if (target.closest("button, a, input, textarea, select, [role='button']")) return
          const handle = target.closest<HTMLElement>("[data-resize-handle]")
          if (handle) {
            begin(e, handle.dataset.resizeHandle as ResizeDir)
          } else if (target.closest('[data-slot="dialog-header"]')) {
            begin(e, "move")
          }
        }}
        {...props}
      >
        {children}
        {floatingEnabled &&
          RESIZE_HANDLES.map(({ dir, className }) => (
            <div key={dir} data-resize-handle={dir} className={cn("absolute touch-none", className)} />
          ))}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {maximizable && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMaximizedChange?.(!maximized)}
              title={maximized ? "Restore down" : "Maximize"}
              style={{
                backgroundImage: "linear-gradient(155deg, color-mix(in oklch, var(--foreground) 10%, var(--card)) 0%, var(--card) 70%)",
                boxShadow: "inset 0 1px 0 color-mix(in oklch, white 45%, transparent), 0 1px 2px rgba(0,0,0,0.15)",
              }}
              className="rounded-md border border-border/60"
            >
              {maximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
              <span className="sr-only">{maximized ? "Restore down" : "Maximize"}</span>
            </Button>
          )}
          {showCloseButton && (
            <DialogPrimitive.Close data-slot="dialog-close" asChild>
              <Button variant="ghost" size="icon-sm">
                <XIcon />
                <span className="sr-only">Close</span>
              </Button>
            </DialogPrimitive.Close>
          )}
        </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "-mx-4 -mt-4 flex flex-col gap-1.5 rounded-t-xl border-b border-primary/20 bg-primary/10 px-4 pt-4 pb-3",
        className
      )}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "font-heading text-lg leading-none font-semibold",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
