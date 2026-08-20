import { useEffect } from 'react'
import React from 'react'

/** Detect hover capability (returns false on touch devices) */
export function useHasHover() {
  return window.matchMedia('(hover: hover)').matches
}

/** Detect if viewing in mobile layout */
export function useIsMobileLayout() {
  return window.matchMedia('(max-width: 768px)').matches
}

/** Detect landscape orientation on phones */
export function useIsLandscape() {
  return window.matchMedia('(orientation: landscape)').matches
}

/** Handle safe area insets for notched devices */
export function useSafeAreaInsets() {
  return {
    top: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0px',
    right: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0px',
    bottom: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0px',
    left: getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0px',
  }
}

/** Prevent viewport scroll lock and body scroll management */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (locked) {
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [locked])
}

/** Handle sidebar swipe gesture for mobile */
export function useSwipeGesture(
  onSwipeRight?: () => void,
  onSwipeLeft?: () => void,
  threshold = 60
) {
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

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeRight, onSwipeLeft, threshold])
}

/** Handle keyboard visibility on mobile */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = React.useState(0)

  useEffect(() => {
    const handleResize = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.clientHeight
      setKeyboardHeight(documentHeight - windowHeight)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return keyboardHeight
}
