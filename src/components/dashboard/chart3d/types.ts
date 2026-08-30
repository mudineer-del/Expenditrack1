/** One point any of the WebGL 3D chart scenes (donut, bar, area) can plot — the same
 *  {key, value, invoices} shape every existing chart already builds from `seriesFromGroups`,
 *  just with a resolved display `label` and a per-point `color` attached so the scene
 *  doesn't need to know anything about the app's palette logic. */
export interface Chart3DDatum {
  key: string
  label: string
  value: number
  color: string
  invoices?: unknown[]
}

/** Caps a series to `max` categories, folding the remainder into a single "Other" point
 *  (its value the sum of what got folded in, its `invoices` the union of theirs) — same
 *  "top N + Other" idea the brief asks for, reusable across donut/bar/area. Sorting is the
 *  caller's job; this only decides where to cut. Zero/negative values are dropped first —
 *  they can't be given a meaningful angle/height without visually lying about their size. */
export function capWithOther(data: Chart3DDatum[], max: number, otherColor: string): Chart3DDatum[] {
  const positive = data.filter((d) => Number.isFinite(d.value) && d.value > 0)
  if (positive.length <= max) return positive
  const head = positive.slice(0, max - 1)
  const rest = positive.slice(max - 1)
  const otherValue = rest.reduce((s, d) => s + d.value, 0)
  const otherInvoices = rest.flatMap((d) => d.invoices ?? [])
  return [...head, { key: "__other__", label: "Other", value: otherValue, color: otherColor, invoices: otherInvoices }]
}

/** Evenly samples an ordered series down to `max` points (always keeping the first and
 *  last) for a WebGL scene that would otherwise build one mesh vertex per point — this
 *  only thins the 3D ribbon's geometry, it never touches the totals/values shown anywhere
 *  else, so filtering, tooltips and the underlying data stay exact. */
export function downsampleOrdered<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points
  const step = (points.length - 1) / (max - 1)
  const out: T[] = []
  for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)])
  return out
}
