import type { WellCostTransaction } from "@/types/wellCost"

export interface DailySpend {
  date: string
  amount: number
}

export interface ProjectionPoint {
  date: string
  actual?: number
  forecast?: number
}

export type ProjectionStatus = "On track" | "At risk" | "Over budget" | "No budget"

/** Longest forecast horizon charted, in calendar days — a guard against a mistyped
 *  remaining-days value stretching the chart. */
export const MAX_FORECAST_DAYS = 730

const round2 = (n: number) => Math.round(n * 100) / 100

function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Actual (not commitment) spend per entry date, summed across the given cost centres.
 *  Days without an entry are not included — see activityCells() for the calendar view. */
export function dailyActualSpend(transactions: WellCostTransaction[], costCentreIds: Set<string>): DailySpend[] {
  const byDate = new Map<string, number>()
  for (const t of transactions) {
    if (t.kind !== "actual" || !t.entryDate || !costCentreIds.has(t.costCentreId)) continue
    byDate.set(t.entryDate, (byDate.get(t.entryDate) ?? 0) + (Number(t.amount) || 0))
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount: round2(amount) }))
}

export function totalActual(daily: DailySpend[]): number {
  return round2(daily.reduce((s, d) => s + d.amount, 0))
}

/** Average spend per calendar day over the last `windowDays` days up to the latest entry.
 *  Calendar days with no entry count as zero, since the importer drops zero-amount days. */
export function burnRate(daily: DailySpend[], windowDays = 7): number {
  if (!daily.length || windowDays <= 0) return 0
  const latest = daily[daily.length - 1].date
  const start = addDays(latest, -(windowDays - 1))
  const inWindow = daily.filter((d) => d.date >= start && d.date <= latest)
  return round2(inWindow.reduce((s, d) => s + d.amount, 0) / windowDays)
}

/** Spend to date plus the current burn rate over the remaining days. */
export function forecastAtCompletion(actual: number, rate: number, remainingDays: number): number {
  const days = Math.min(Math.max(0, Math.floor(remainingDays) || 0), MAX_FORECAST_DAYS)
  return round2(actual + rate * days)
}

export function projectionStatus(forecast: number, budget: number): ProjectionStatus {
  if (budget <= 0) return "No budget"
  const ratio = forecast / budget
  if (ratio > 1) return "Over budget"
  if (ratio >= 0.8) return "At risk"
  return "On track"
}

/** Cumulative actual per entry date, followed by a straight-line forecast at the burn rate
 *  for each remaining calendar day. The forecast starts at the last actual point so the two
 *  lines join. */
export function cumulativeWithForecast(daily: DailySpend[], rate: number, remainingDays: number): ProjectionPoint[] {
  const points: ProjectionPoint[] = []
  let running = 0
  for (const d of daily) {
    running = round2(running + d.amount)
    points.push({ date: d.date, actual: running })
  }
  const days = Math.min(Math.max(0, Math.floor(remainingDays) || 0), MAX_FORECAST_DAYS)
  if (!daily.length || days === 0) return points
  const last = points[points.length - 1]
  last.forecast = last.actual
  for (let i = 1; i <= days; i++) {
    points.push({ date: addDays(last.date, i), forecast: round2((last.actual ?? 0) + rate * i) })
  }
  return points
}

/** Dates that have at least one actual entry written by a report import (notes start with
 *  "Imported from" or "Reconciliation for"), as opposed to one typed in by hand. */
export function importedDates(transactions: WellCostTransaction[], costCentreIds: Set<string>): Set<string> {
  const dates = new Set<string>()
  for (const t of transactions) {
    if (t.kind !== "actual" || !t.entryDate || !costCentreIds.has(t.costCentreId)) continue
    if (/^(Imported from|Reconciliation for)/.test(t.notes ?? "")) dates.add(t.entryDate)
  }
  return dates
}

export interface ActivityCell extends DailySpend {
  imported: boolean
}

/** One cell per calendar day for the last `days` days up to the latest entry. */
export function activityCells(daily: DailySpend[], days = 90, imported: Set<string> = new Set()): ActivityCell[] {
  if (!daily.length) return []
  const latest = daily[daily.length - 1].date
  const byDate = new Map(daily.map((d) => [d.date, d.amount]))
  const cells: ActivityCell[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(latest, -i)
    cells.push({ date, amount: byDate.get(date) ?? 0, imported: imported.has(date) })
  }
  return cells
}

export interface CostDepthPoint {
  label: string
  date: string
  depth: number
  cumulativeCost: number
}

/** Cumulative actual cost at each milestone that has both an actual date and an actual depth,
 *  ordered by depth. Milestones are the only place depth is recorded, so this is a point per
 *  milestone rather than a point per day. */
export function costAtMilestones(
  milestones: { label: string; actualDate: string; actualDepth: number | "" }[],
  daily: DailySpend[]
): CostDepthPoint[] {
  const points: CostDepthPoint[] = []
  for (const m of milestones) {
    if (!m.actualDate || m.actualDepth === "" || !Number.isFinite(Number(m.actualDepth))) continue
    const cumulativeCost = round2(daily.filter((d) => d.date <= m.actualDate).reduce((s, d) => s + d.amount, 0))
    points.push({ label: m.label, date: m.actualDate, depth: Number(m.actualDepth), cumulativeCost })
  }
  return points.sort((a, b) => a.depth - b.depth || a.date.localeCompare(b.date))
}

/** Cumulative actual cost on each day that has a measured depth, in date order. This is the
 *  day-by-day cost-versus-depth series; costAtMilestones() is the fallback before depth is
 *  captured per day. */
export function costAtDepthDays(depths: { entryDate: string; depthMd: number | "" }[], daily: DailySpend[]): CostDepthPoint[] {
  const points: CostDepthPoint[] = []
  for (const d of depths) {
    if (d.depthMd === "" || !Number.isFinite(Number(d.depthMd))) continue
    const cumulativeCost = round2(daily.filter((s) => s.date <= d.entryDate).reduce((s, x) => s + x.amount, 0))
    points.push({ label: d.entryDate, date: d.entryDate, depth: Number(d.depthMd), cumulativeCost })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}
