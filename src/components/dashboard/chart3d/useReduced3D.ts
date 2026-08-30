import { useEffect, useState } from "react"
import { useIsMobile } from "@/hooks/useIsMobile"
import { useDisplayStore } from "@/store/useDisplayStore"

export interface Reduced3DConfig {
  reduced: boolean
  /** Multiplies the user's chosen extrusion depth. */
  depthScale: number
  /** Multiplies the user's chosen camera tilt angle. */
  tiltScale: number
  shadows: boolean
}

/** Combines the OS-level `prefers-reduced-motion`, the app's own "Reduce 3D effects"
 *  setting (Settings ▸ Charts, or a chart's own right-click menu), and small-screen
 *  detection — any one of these dials back extrusion depth, camera tilt and shadows on a
 *  WebGL 3D chart while keeping the SAME chart type the user picked. Per the brief: don't
 *  silently swap the chart family, just tone down the 3D presentation. */
export function useReduced3D(): Reduced3DConfig {
  const appReduced = useDisplayStore((s) => s.reduce3DEffects)
  const isMobile = useIsMobile()
  const [osReduced, setOsReduced] = useState(() => (typeof window === "undefined" ? false : window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false))

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setOsReduced(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  const reduced = appReduced || osReduced || isMobile
  return {
    reduced,
    depthScale: reduced ? 0.45 : 1,
    tiltScale: reduced ? 0.55 : 1,
    shadows: !reduced && !osReduced,
  }
}
