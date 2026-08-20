import { useEffect, useState } from "react"

/** Reactive matchMedia — plain `matchMedia(query).matches` reads once per
 *  render and never updates on resize/rotation; this subscribes to the
 *  query's own change event so callers actually re-render when it flips. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = () => setMatches(mql.matches)
    handler()
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [query])
  return matches
}

/** Detect hover capability (returns false on touch devices) */
export function useHasHover(): boolean {
  return useMediaQuery("(hover: hover)")
}

/** Detect if viewing in mobile layout */
export function useIsMobileLayout(): boolean {
  return useMediaQuery("(max-width: 768px)")
}

/** Detect landscape orientation on phones */
export function useIsLandscape(): boolean {
  return useMediaQuery("(orientation: landscape)")
}

export interface SafeAreaInsets {
  top: string
  right: string
  bottom: string
  left: string
}

const SAFE_AREA_VARS: Record<keyof SafeAreaInsets, string> = {
  top: "--sat",
  right: "--sar",
  bottom: "--sab",
  left: "--sal",
}

function readSafeAreaInsets(): SafeAreaInsets {
  const style = getComputedStyle(document.documentElement)
  const read = (varName: string) => style.getPropertyValue(varName).trim() || "0px"
  return {
    top: read(SAFE_AREA_VARS.top),
    right: read(SAFE_AREA_VARS.right),
    bottom: read(SAFE_AREA_VARS.bottom),
    left: read(SAFE_AREA_VARS.left),
  }
}

/** Reads the env(safe-area-inset-*) values bridged into --sat/--sar/--sab/--sal
 *  custom properties on :root (see index.css) — getComputedStyle can't resolve
 *  a raw `env(...)` call passed as a property name, only an actual custom
 *  property, so the bridge is required for this to return anything but zeros. */
export function useSafeAreaInsets(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>(() =>
    typeof window === "undefined" ? { top: "0px", right: "0px", bottom: "0px", left: "0px" } : readSafeAreaInsets()
  )
  useEffect(() => {
    const update = () => setInsets(readSafeAreaInsets())
    update()
    window.addEventListener("resize", update)
    window.addEventListener("orientationchange", update)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("orientationchange", update)
    }
  }, [])
  return insets
}

/** Locks body scroll (for mobile drawers/dialogs) without losing scroll
 *  position — plain `position: fixed` with no top offset makes the page jump
 *  to the top the instant it's unlocked, since fixed positioning drops the
 *  element out of flow and forgets where it was. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const scrollY = window.scrollY
    const { style } = document.body
    const prev = { position: style.position, top: style.top, left: style.left, right: style.right, width: style.width, overflow: style.overflow }
    style.position = "fixed"
    style.top = `-${scrollY}px`
    style.left = "0"
    style.right = "0"
    style.width = "100%"
    style.overflow = "hidden"
    return () => {
      style.position = prev.position
      style.top = prev.top
      style.left = prev.left
      style.right = prev.right
      style.width = prev.width
      style.overflow = prev.overflow
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}

/** Handle sidebar swipe gesture for mobile */
export function useSwipeGesture(onSwipeRight?: () => void, onSwipeLeft?: () => void, threshold = 60) {
  useEffect(() => {
    let startX = 0

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX
      const diff = endX - startX

      if (Math.abs(diff) > threshold) {
        if (diff > 0 && onSwipeRight) {
          onSwipeRight()
        } else if (diff < 0 && onSwipeLeft) {
          onSwipeLeft()
        }
      }
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true })
    document.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener("touchstart", handleTouchStart)
      document.removeEventListener("touchend", handleTouchEnd)
    }
  }, [onSwipeRight, onSwipeLeft, threshold])
}

/** Handle keyboard visibility on mobile. Uses visualViewport rather than
 *  comparing window.innerHeight to documentElement.clientHeight — the
 *  innerHeight approach is the common fallback technique but is unreliable
 *  on iOS Safari, where innerHeight often doesn't shrink when the on-screen
 *  keyboard opens at all. */
export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handleResize = () => {
      const diff = window.innerHeight - vv.height
      setKeyboardHeight(diff > 100 ? diff : 0)
    }
    handleResize()
    vv.addEventListener("resize", handleResize)
    return () => vv.removeEventListener("resize", handleResize)
  }, [])

  return keyboardHeight
}
