import { fmtMoney, type TrendPoint } from "@/lib/dashboard"
import { aggregate, groupRows, type Aggregate, type ReportGroup } from "@/lib/reports"
import type { Invoice } from "@/types/invoice"

export type ReportPeriod = "week" | "fortnight" | "month"

export const REPORT_PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: "week", label: "Weekly" },
  { key: "fortnight", label: "Fortnightly" },
  { key: "month", label: "Monthly" },
]

export interface PeriodRange {
  from: string
  to: string
  /** Long form for narrative prose, e.g. "1–15 March 2026" or "March 2026". */
  label: string
  /** Compact form for chart axes/tables, e.g. "Mar 2026" or "1–15 Mar". */
  shortLabel: string
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

function pad2(n: number): string {
  return String(n).padStart(2, "0")
}
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function fromISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}
function startOfISOWeek(d: Date): Date {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff)
  return s
}

function currentSpan(period: ReportPeriod, anchor: Date): { start: Date; end: Date } {
  if (period === "week") {
    const start = startOfISOWeek(anchor)
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
    return { start, end }
  }
  if (period === "fortnight") {
    if (anchor.getDate() <= 15) {
      return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1), end: new Date(anchor.getFullYear(), anchor.getMonth(), 15) }
    }
    return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 16), end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0) }
  }
  return { start: new Date(anchor.getFullYear(), anchor.getMonth(), 1), end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0) }
}

/** Moves `anchor` `steps` whole periods forward (negative = back), preserving calendar alignment. */
export function shiftAnchor(period: ReportPeriod, anchor: Date, steps: number): Date {
  if (period === "week") return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + steps * 7)
  if (period === "month") return new Date(anchor.getFullYear(), anchor.getMonth() + steps, 1)
  // fortnight: step through calendar halves one at a time so month-length differences don't drift
  let d = anchor
  const dir = steps >= 0 ? 1 : -1
  for (let i = 0; i < Math.abs(steps); i++) {
    d = dir > 0
      ? d.getDate() <= 15 ? new Date(d.getFullYear(), d.getMonth(), 16) : new Date(d.getFullYear(), d.getMonth() + 1, 1)
      : d.getDate() <= 15 ? new Date(d.getFullYear(), d.getMonth() - 1, 16) : new Date(d.getFullYear(), d.getMonth(), 1)
  }
  return d
}

function formatDay(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function periodRange(period: ReportPeriod, anchor: Date): PeriodRange {
  const { start, end } = currentSpan(period, anchor)
  if (period === "month") {
    return { from: toISODate(start), to: toISODate(end), label: `${MONTHS[start.getMonth()]} ${start.getFullYear()}`, shortLabel: `${MONTHS_SHORT[start.getMonth()]} ${String(start.getFullYear()).slice(2)}` }
  }
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const label = sameMonth
    ? `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`
    : `${formatDay(start)} – ${formatDay(end)} ${end.getFullYear()}`
  const shortLabel = sameMonth ? `${start.getDate()}–${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}` : `${formatDay(start)}–${formatDay(end)}`
  return { from: toISODate(start), to: toISODate(end), label, shortLabel }
}

export function previousPeriodRange(period: ReportPeriod, anchor: Date): PeriodRange {
  return periodRange(period, shiftAnchor(period, anchor, -1))
}

function rowsInRange(invoices: Invoice[], range: PeriodRange): Invoice[] {
  return invoices.filter((r) => {
    const d = r.invoiceDate
    return d && d >= range.from && d <= range.to
  })
}

/** Trailing `count` periods (oldest first, current period last) as a Recharts-ready series —
 *  same `{month, key, total, invoices}` shape TrendChart already expects everywhere else. */
export function buildTrend(period: ReportPeriod, anchor: Date, invoices: Invoice[], count = 12): TrendPoint[] {
  const points: TrendPoint[] = []
  for (let i = count - 1; i >= 0; i--) {
    const r = periodRange(period, shiftAnchor(period, anchor, -i))
    const rows = rowsInRange(invoices, r)
    points.push({ month: r.shortLabel, key: r.from, total: rows.reduce((s, inv) => s + (Number(inv.amountInclTax) || 0), 0), invoices: rows })
  }
  return points
}

export interface WatchItem {
  vendor: string
  contractNo: string
  amount: number
  days: number
  invoice: Invoice
}

/** Currently-outstanding invoices (received, not yet cleared) aged past `thresholdDays` —
 *  scanned across every invoice in scope, not just the reporting period, since an aging
 *  risk doesn't stop being current just because it was raised last period. */
export function buildWatchList(invoices: Invoice[], thresholdDays = 40, limit = 5): WatchItem[] {
  const today = new Date()
  const items: WatchItem[] = []
  invoices.forEach((r) => {
    if (!r.receivingDate || r.clearanceDate) return
    const rd = fromISODate(r.receivingDate)
    if (isNaN(rd.getTime())) return
    const days = Math.round((today.getTime() - rd.getTime()) / 86400000)
    if (days <= thresholdDays) return
    items.push({ vendor: r.vendor || "Unknown", contractNo: (r.contractNo || "—").trim() || "—", amount: (Number(r.amountInclTax) || 0) - (Number(r.amountPaid) || 0), days, invoice: r })
  })
  return items.sort((a, b) => b.days - a.days).slice(0, limit)
}

export interface ReportData {
  period: ReportPeriod
  range: PeriodRange
  prevRange: PeriodRange
  rows: Invoice[]
  prevRows: Invoice[]
  stats: Aggregate
  prevStats: Aggregate
  contractors: ReportGroup[]
  prevContractors: ReportGroup[]
  services: ReportGroup[]
  prevServices: ReportGroup[]
  status: ReportGroup[]
  trend: TrendPoint[]
  watchList: WatchItem[]
  watchThresholdDays: number
}

export function buildReportData(period: ReportPeriod, anchor: Date, invoices: Invoice[]): ReportData {
  const range = periodRange(period, anchor)
  const prevRange = previousPeriodRange(period, anchor)
  const rows = rowsInRange(invoices, range)
  const prevRows = rowsInRange(invoices, prevRange)
  const watchThresholdDays = 40
  return {
    period,
    range,
    prevRange,
    rows,
    prevRows,
    stats: aggregate(rows),
    prevStats: aggregate(prevRows),
    contractors: groupRows(rows, "vendor").sort((a, b) => b.incl - a.incl),
    prevContractors: groupRows(prevRows, "vendor").sort((a, b) => b.incl - a.incl),
    services: groupRows(rows, "service").sort((a, b) => b.incl - a.incl),
    prevServices: groupRows(prevRows, "service").sort((a, b) => b.incl - a.incl),
    status: groupRows(rows, "status").sort((a, b) => b.incl - a.incl),
    trend: buildTrend(period, anchor, invoices, 12),
    watchList: buildWatchList(invoices, watchThresholdDays),
    watchThresholdDays,
  }
}

export interface NarrativeMove {
  title: string
  body: string
  tone: "good" | "bad" | "neutral"
}

export interface Narrative {
  lede: string
  moves: NarrativeMove[]
  closing: string
}

function pctDelta(cur: number, prev: number): number | null {
  if (!prev) return null
  return ((cur - prev) / prev) * 100
}

/** Deterministic, template-based narrative — every clause traces back to a specific
 *  computed delta, so it stays trustworthy (and explainable) rather than reading like a
 *  black box. Not an LLM call: this runs client-side, instantly, on every filter change. */
export function buildNarrative(d: ReportData): Narrative {
  const spendDelta = pctDelta(d.stats.incl, d.prevStats.incl)
  const taDelta = d.stats.taAvg !== null && d.prevStats.taAvg !== null ? d.stats.taAvg - d.prevStats.taAvg : null

  const spendVerb = spendDelta === null ? "came in at" : spendDelta >= 0 ? "rose to" : "eased to"
  const spendClause = spendDelta === null ? "" : `, ${spendDelta >= 0 ? "up" : "down"} ${Math.abs(spendDelta).toFixed(1)}% on ${d.prevRange.label}`

  let taClause = ""
  if (taDelta !== null && d.stats.taAvg !== null) {
    taClause =
      taDelta <= -1
        ? ` Average clearance time improved to ${d.stats.taAvg.toFixed(1)} days.`
        : taDelta >= 1
          ? ` Average clearance time slipped to ${d.stats.taAvg.toFixed(1)} days, worth watching next period.`
          : ` Average clearance time held steady at ${d.stats.taAvg.toFixed(1)} days.`
  } else if (d.stats.taAvg !== null) {
    taClause = ` Average clearance time was ${d.stats.taAvg.toFixed(1)} days.`
  }

  const lede = `${d.range.label} expenditure ${spendVerb} ${fmtMoney(d.stats.incl)} across ${d.stats.count} invoice${d.stats.count === 1 ? "" : "s"}${spendClause}.${taClause}`

  const moves: NarrativeMove[] = []

  const serviceSwings = d.services
    .map((g) => ({ name: g.key, delta: g.incl - (d.prevServices.find((p) => p.key === g.key)?.incl || 0) }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
  const swing = serviceSwings[0]
  if (swing && Math.abs(swing.delta) > 0) {
    moves.push({
      title: swing.delta >= 0 ? `${swing.name} led the increase` : `${swing.name} pulled back the most`,
      body: `${swing.delta >= 0 ? "Added" : "Gave back"} ${fmtMoney(Math.abs(swing.delta))} versus ${d.prevRange.label}, the largest swing of any service line this period.`,
      tone: "neutral",
    })
  }

  const top = d.contractors[0]
  if (top && d.stats.incl > 0) {
    const share = (top.incl / d.stats.incl) * 100
    const prevShare = d.prevStats.incl ? ((d.prevContractors.find((c) => c.key === top.key)?.incl || 0) / d.prevStats.incl) * 100 : null
    const drift = prevShare !== null ? share - prevShare : null
    moves.push({
      title: `${top.key} stayed the anchor contractor`,
      body:
        `${share.toFixed(0)}% of this period's spend` +
        (drift === null ? "." : Math.abs(drift) <= 4 ? ", in line with last period." : drift > 0 ? ", up from last period's share." : ", down from last period's share."),
      tone: drift !== null && Math.abs(drift) > 8 ? "bad" : "neutral",
    })
  }

  if (d.watchList.length) {
    const sum = d.watchList.reduce((s, w) => s + w.amount, 0)
    const vendors = new Set(d.watchList.map((w) => w.vendor)).size
    moves.push({
      title: `${d.watchList.length} invoice${d.watchList.length === 1 ? "" : "s"} aging past ${d.watchThresholdDays} days`,
      body: `${fmtMoney(sum)} combined, concentrated in ${vendors} contractor${vendors === 1 ? "" : "s"}. Detail in the watch list.`,
      tone: "bad",
    })
  } else {
    moves.push({
      title: `No invoices are aging past ${d.watchThresholdDays} days`,
      body: `The outstanding queue is current — nothing needs an escalation this period.`,
      tone: "good",
    })
  }

  const closing = d.watchList.length
    ? `Recommendation: no committee action needed on portfolio spend this period. Route the ${d.watchList.length} aging invoice${d.watchList.length === 1 ? "" : "s"} to Contracts for a clearance decision before the next period's close.`
    : `Recommendation: no committee action needed this period — spend, turnaround and the outstanding queue are all within normal range.`

  return { lede, moves, closing }
}
