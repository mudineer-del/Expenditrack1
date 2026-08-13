/** Recharts populates `activePayload` on a chart-level click event with whichever data
 *  point the pointer landed nearest to — this pulls the original data object back out.
 *  Works the same way across Bar/Line/Area/Radar charts since they all share the same
 *  mouse-tracking mechanism that powers the tooltip. */
export function activeChartPayload<T>(e: unknown): T | null {
  const evt = e as { activePayload?: { payload: T }[] } | null
  return evt?.activePayload?.[0]?.payload ?? null
}
