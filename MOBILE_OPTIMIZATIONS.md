# Mobile Browser Optimizations

This document outlines all mobile-specific optimizations implemented for the Expenditure Tracker React app.

## Meta Tags (index.html)

- **viewport-fit=cover**: Full-screen support for notched devices
- **color-scheme**: Light/dark mode support
- **theme-color**: Dynamic theme color for browser UI
- **apple-mobile-web-app-capable**: Installable as PWA
- **apple-mobile-web-app-status-bar-style**: Status bar styling
- **format-detection**: Disable automatic link detection (telephone, email, dates)

## CSS Optimizations (src/index.css)

### 1. Dynamic Viewport Height
- `height: 100dvh` support for address bar expansion/collapse
- Smooth scrolling with `-webkit-overflow-scrolling: touch`
- Prevent rubber-band scroll with `overscroll-behavior: contain`

### 2. Touch Targets
- Minimum 44x44px touch targets for all interactive elements
- `touch-action: manipulation` to prevent double-tap delays
- Removal of tap highlight (`-webkit-tap-highlight-color: transparent`)

### 3. Safe Area Insets
- Support for notched devices with `env(safe-area-inset-*)`
- Padding applied to body and sidebar-inset

### 4. Mobile Table Cards
- Tables switch to card layout below 768px
- Hidden headers, visible data labels
- Full-width responsive cards

### 5. Glassmorphism
- `.card-glass` class for backdrop-blur effect
- Works in both light and dark themes

### 6. Responsive Typography
- Input fields use 16px base font (prevents iOS zoom)
- Landscape phone optimizations (max-height: 480px)

## React Hooks (src/hooks/useMobileOptimizations.ts)

- **useHasHover()**: Detect hover capability (false on touch)
- **useIsMobileLayout()**: Check if < 768px width
- **useIsLandscape()**: Detect landscape orientation
- **useSafeAreaInsets()**: Get safe area insets for notched devices
- **useBodyScrollLock()**: Lock/unlock body scroll
- **useSwipeGesture()**: Handle left/right swipe (sidebar toggle, etc.)
- **useKeyboardHeight()**: Detect mobile keyboard height

## Mobile Input Component (src/components/ui/mobile-input.tsx)

Smart input component that automatically applies:
- Correct `inputMode` (numeric, email, tel, url, search)
- `enterKeyHint` for keyboard return button styling
- `autocapitalize`, `autocorrect`, `spellcheck` attributes
- 16px base font to prevent iOS zoom

## Usage Examples

### Using Mobile Input
```tsx
import { MobileInput } from "@/components/ui/mobile-input"

<MobileInput 
  type="email"
  placeholder="Enter email"
  enterKeyHint="next"
/>

<MobileInput 
  type="number"
  placeholder="Enter amount"
  inputMode="numeric"
/>

<MobileInput 
  type="search"
  placeholder="Search..."
  enterKeyHint="search"
/>
```

### Using Mobile Hooks
```tsx
import { useSwipeGesture, useIsMobileLayout } from "@/hooks/useMobileOptimizations"

function MyComponent() {
  const isMobile = useIsMobileLayout()
  
  useSwipeGesture(
    onSwipeRight: () => openSidebar(),
    onSwipeLeft: () => closeSidebar(),
    threshold: 60
  )
  
  return isMobile ? <MobileView /> : <DesktopView />
}
```

### Using CSS Utilities
```tsx
// Glass effect
<div className="card-glass rounded-lg">Content</div>

// Mobile table
<table className="mobile-table">...</table>

// Mobile nav item
<div className="mobile-nav-item">Item</div>
```

## Browser Support

- iOS Safari 13+
- Android Chrome 80+
- All modern browsers with viewport-fit support
- Graceful fallbacks for older browsers

## Performance Considerations

- Touch actions optimized to reduce input latency
- Smooth scrolling uses native GPU acceleration
- Safe area insets prevent layout shift on notched devices
- Mobile table cards reduce horizontal scroll needs

## Theming

The app uses:
- **Light mode**: oklch(1 0 0) background, oklch(0.145 0 0) text
- **Dark mode**: oklch(0.145 0 0) background, oklch(0.985 0 0) text
- **Primary color**: #0A86C8 (light), #3BA3E0 (dark)
- Dynamic color scheme based on OS preference
