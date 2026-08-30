import { Component, lazy, Suspense, type ReactNode } from "react"
import { isWebGLAvailable } from "./webgl"
import { Chart3DLoading } from "./Chart3DShared"

export const LazyDonut3DScene = lazy(() => import("./Donut3DScene").then((m) => ({ default: m.Donut3DScene })))
export const LazyBar3DScene = lazy(() => import("./Bar3DScene").then((m) => ({ default: m.Bar3DScene })))
export const LazyArea3DScene = lazy(() => import("./Area3DScene").then((m) => ({ default: m.Area3DScene })))

interface BoundaryState {
  hasError: boolean
}

/** Catches a WebGL 3D scene crashing at runtime (a lost context, an out-of-memory GPU,
 *  a driver quirk) and swaps to the same `fallback` a missing WebGL context would use —
 *  the chart never just goes blank. */
class Chart3DErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error("3D chart scene failed — falling back to the 2D chart.", error)
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

/** Wraps a lazy-loaded WebGL 3D chart scene with: a WebGL-availability check (skips
 *  straight to `fallback` — the closest SVG chart type — when WebGL isn't available at
 *  all, e.g. a locked-down browser), an error boundary (falls back on a runtime GL
 *  failure), and a `Suspense` boundary so the (large) Three.js chunk only downloads once a
 *  3D chart type is actually selected, showing a same-footprint loading placeholder
 *  meanwhile instead of a layout shift. */
export function Chart3DBoundary({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  if (!isWebGLAvailable()) return <>{fallback}</>
  return (
    <Chart3DErrorBoundary fallback={fallback}>
      <Suspense fallback={<Chart3DLoading />}>{children}</Suspense>
    </Chart3DErrorBoundary>
  )
}
