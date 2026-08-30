let cached: boolean | null = null

/** WebGL2 (falling back to WebGL1) availability check, cached for the session — used to
 *  decide whether a "3D" chart type (donut3d/donut3dExploded/donutSemi3d/bar3d/area3d) can
 *  render its real Three.js scene or must fall back to the closest SVG chart type (see
 *  `fallbackChartType` in ./types) — e.g. a locked-down corporate browser, a software
 *  renderer that's been disabled, or a headless/print context. */
export function isWebGLAvailable(): boolean {
  if (cached !== null) return cached
  if (typeof document === "undefined") return false
  try {
    const canvas = document.createElement("canvas")
    cached = !!(canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
  } catch {
    cached = false
  }
  return cached
}
