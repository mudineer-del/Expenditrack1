import type { Invoice } from "@/types/invoice"

export type ReportMode = "contract" | "compare" | "period" | "management"

export type GroupBy =
  | "month" | "quarter" | "year" | "contract" | "vendor" | "service" | "type" | "region" | "status" | "well"
  | "department" | "rig" | "location"

export interface ReportFilters {
  contract: string
  vendor: string
  service: string
  type: string
  region: string
  status: string
  well: string
  year: string
  qtr: string
  from: string
  to: string
  groupBy: GroupBy
}

export const BLANK_REPORT_FILTERS: ReportFilters = {
  contract: "", vendor: "", service: "", type: "", region: "", status: "", well: "",
  year: "", qtr: "", from: "", to: "", groupBy: "month",
}

function normStr(v: unknown): string {
  return String(v == null ? "" : v).trim().toLowerCase()
}
function normContract(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase()
}

/** Ported from turnaround (index.html:2290) / isCleared (index.html:2291). */
export function turnaroundDays(r: Invoice): number | null {
  if (!r.receivingDate || !r.clearanceDate) return null
  const d1 = new Date(r.receivingDate)
  const d2 = new Date(r.clearanceDate)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null
  return Math.round((d2.getTime() - d1.getTime()) / 86400000)
}
export function isCleared(r: Invoice): boolean {
  return (r.status || "").toLowerCase().includes("cleared")
}

/** Ported from reportRows (index.html:4298-4313). */
export function reportRows(invoices: Invoice[], f: ReportFilters): Invoice[] {
  let rows = invoices.slice()
  if (f.contract) rows = rows.filter((r) => normContract(r.contractNo) === normContract(f.contract))
  if (f.vendor) rows = rows.filter((r) => normStr(r.vendor) === normStr(f.vendor))
  if (f.service) rows = rows.filter((r) => normStr(r.service) === normStr(f.service))
  if (f.type) rows = rows.filter((r) => normStr(r.type) === normStr(f.type))
  if (f.region) rows = rows.filter((r) => normStr(r.region) === normStr(f.region))
  if (f.status) rows = rows.filter((r) => normStr(r.status) === normStr(f.status))
  if (f.well) rows = rows.filter((r) => normStr(r.wellName) === normStr(f.well))
  if (f.year) rows = rows.filter((r) => String(r.year) === String(f.year) || String(r.yr) === String(f.year))
  if (f.qtr) rows = rows.filter((r) => r.qtr === f.qtr)
  if (f.from) rows = rows.filter((r) => { const d = r.invoiceDate || r.receivingDate; return d && d >= f.from })
  if (f.to) rows = rows.filter((r) => { const d = r.invoiceDate || r.receivingDate; return d && d <= f.to })
  return rows
}

export interface Aggregate {
  count: number
  exclTax: number
  tax: number
  incl: number
  paid: number
  outstanding: number
  cleared: number
  pending: number
  clearedPct: number
  taAvg: number | null
  taMax: number | null
  taMin: number | null
  taCount: number
  delayed: number
  openItems: number
}

/** Ported from aggregate (index.html:4316-4337). */
export function aggregate(rows: Invoice[]): Aggregate {
  const exclTax = rows.reduce((s, r) => s + (Number(r.amountExclTax) || 0), 0)
  const tax = rows.reduce((s, r) => s + (Number(r.tax) || 0), 0)
  const incl = rows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const paid = rows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0)
  const cleared = rows.filter(isCleared).length
  const pending = rows.filter((r) => {
    const s = (r.status || "").toLowerCase()
    return s.includes("under") || s.includes("sent") || s.includes("budget") || s.includes("process")
  }).length
  const taRaw = rows.map(turnaroundDays).filter((d): d is number => d !== null && d >= 0)
  const taSum = taRaw.reduce((s, d) => s + d, 0)
  const taAvg = taRaw.length ? taSum / taRaw.length : null
  const taMax = taRaw.length ? Math.max(...taRaw) : null
  const taMin = taRaw.length ? Math.min(...taRaw) : null
  const delayed = taRaw.filter((d) => d > 30).length
  const openItems = rows.filter((r) => r.receivingDate && !r.clearanceDate).length
  return {
    count: rows.length, exclTax, tax, incl, paid, outstanding: incl - paid,
    cleared, pending, clearedPct: rows.length ? (cleared / rows.length) * 100 : 0,
    taAvg, taMax, taMin, taCount: taRaw.length, delayed, openItems,
  }
}

export interface ReportGroup extends Aggregate {
  key: string
  rows: Invoice[]
}

/** Ported from groupRows (index.html:4340-4360). */
export function groupRows(rows: Invoice[], groupBy: GroupBy): ReportGroup[] {
  const map: Record<string, Invoice[]> = {}
  rows.forEach((r) => {
    let key: string
    switch (groupBy) {
      case "vendor": key = r.vendor || "Unknown"; break
      case "service": key = r.service || "Unspecified"; break
      case "type": key = r.type || "Unspecified"; break
      case "region": key = r.region || "Unspecified"; break
      case "status": key = r.status || "Unspecified"; break
      case "well": key = r.wellName || "Unspecified"; break
      case "department": key = r.department || "Unspecified"; break
      case "rig": key = r.rig || "Unspecified"; break
      case "location": key = r.location || "Unspecified"; break
      case "year": key = r.year || r.yr || "—"; break
      case "quarter": key = ((r.year || r.yr) ? (r.year || r.yr) + " " : "") + (r.qtr || "—"); break
      case "month": key = r.invoiceDate && /^\d{4}-\d{2}/.test(r.invoiceDate) ? r.invoiceDate.slice(0, 7) : "Undated"; break
      case "contract":
      default: key = (r.contractNo || "").trim() || "No contract"; break
    }
    ;(map[key] = map[key] || []).push(r)
  })
  return Object.entries(map).map(([key, rs]) => ({ key, rows: rs, ...aggregate(rs) }))
}

export const GROUP_BY_OPTIONS: GroupBy[] = [
  "month", "quarter", "year", "contract", "vendor", "service", "type", "region", "status", "well",
  "department", "rig", "location",
]

const GROUP_LABELS: Record<GroupBy, string> = {
  contract: "Contract", vendor: "Contractor", service: "Service", type: "Type", region: "Region",
  status: "Status", well: "Well", month: "Month", quarter: "Quarter", year: "Year",
  department: "Department", rig: "Rig", location: "Location",
}
export function reportGroupLabel(g: GroupBy): string {
  return GROUP_LABELS[g] || "Group"
}

export function taTone(days: number | null): "fast" | "ok" | "slow" | "late" | "na" {
  if (days === null || days === undefined) return "na"
  const d = Math.round(days)
  if (d <= 15) return "fast"
  if (d <= 30) return "ok"
  if (d <= 60) return "slow"
  return "late"
}

export function shortContract(c: string | null | undefined): string {
  if (!c) return "—"
  return c.length > 36 ? "…" + c.slice(-32) : c
}

export function yearsInData(invoices: Invoice[]): string[] {
  return Array.from(new Set(invoices.map((r) => r.year || r.yr).filter(Boolean).map(String))).sort()
}

/** Curated subset of `Aggregate`'s fields worth plotting as a chart's measure — the
 *  per-group data itself already carries every one of these (see `aggregate()`), this
 *  is just the "what's worth a top-level toggle" shortlist for the chart-slot picker. */
export type ChartMeasure = "count" | "incl" | "exclTax" | "paid" | "outstanding" | "taAvg" | "clearedPct"

export const CHART_MEASURES: ChartMeasure[] = ["count", "incl", "exclTax", "paid", "outstanding", "taAvg", "clearedPct"]

const MEASURE_LABELS: Record<ChartMeasure, string> = {
  count: "Invoice count",
  incl: "Total value (incl. tax)",
  exclTax: "Total value (excl. tax)",
  paid: "Amount paid",
  outstanding: "Outstanding balance",
  taAvg: "Avg turnaround (days)",
  clearedPct: "% cleared",
}
export function chartMeasureLabel(m: ChartMeasure): string {
  return MEASURE_LABELS[m] || m
}

const MONEY_MEASURES: ChartMeasure[] = ["incl", "exclTax", "paid", "outstanding"]

/** Formats a raw measure value for an axis tick or tooltip — $ for money measures, "Nd"
 *  for turnaround, "N%" for clearedPct, a plain rounded number for count. Money formatting
 *  is delegated to the caller (via `fmtMoney`, from lib/dashboard.ts) to avoid this file
 *  depending on it — pass it in once, reuse for every value. */
export function formatMeasureValue(measure: ChartMeasure, value: number, fmtMoney: (n: number) => string): string {
  if (measure === "taAvg") return `${value.toFixed(1)}d`
  if (measure === "clearedPct") return `${value.toFixed(1)}%`
  if (measure === "count") return String(Math.round(value))
  if (MONEY_MEASURES.includes(measure)) return fmtMoney(value)
  return String(value)
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** Pretty-prints a `groupRows()` key for chart axis labels — every dimension's key is
 *  already display-ready except month, which comes back as a raw "YYYY-MM" sort key. */
export function formatGroupKey(dimension: GroupBy, key: string): string {
  if (dimension === "month" && /^\d{4}-\d{2}$/.test(key)) {
    const [y, m] = key.split("-")
    return `${MONTH_NAMES[Number(m) - 1].slice(0, 3)} ${y.slice(2)}`
  }
  return key
}

export interface ChartSeriesPoint {
  key: string
  value: number
  invoices: Invoice[]
}

export const TIME_DIMENSIONS: GroupBy[] = ["month", "quarter", "year"]

/** groupRows()'s "undated" bucket key per time dimension — rows with no usable date land
 *  here rather than being dropped. A trend chart should still drop them (the original
 *  monthlyTrend() silently excluded undated rows entirely; a visible "Undated" bar would
 *  be a new, unrequested change in appearance), so seriesFromGroups filters these out
 *  whenever the dimension is time-based. */
const UNDATED_KEYS: Partial<Record<GroupBy, string>> = { month: "Undated", year: "—" }

/** Reads whichever `Aggregate` field the caller wants to plot off of every group —
 *  `groupRows()` already computes all of them in one pass, so reconfiguring a chart's
 *  measure never needs a new aggregation pass, just a different field read here. Sorted
 *  chronologically for time dimensions (key ascending), by value descending otherwise —
 *  same convention `PeriodReportView` already uses for its own groups. */
export function seriesFromGroups(groups: ReportGroup[], dimension: GroupBy, measure: ChartMeasure): ChartSeriesPoint[] {
  const undatedKey = UNDATED_KEYS[dimension]
  const filtered = undatedKey ? groups.filter((g) => g.key !== undatedKey) : groups
  const points = filtered.map((g) => ({ key: g.key, value: g[measure] ?? 0, invoices: g.rows }))
  if (TIME_DIMENSIONS.includes(dimension)) points.sort((a, b) => a.key.localeCompare(b.key))
  else points.sort((a, b) => b.value - a.value)
  return points
}

/** CSV export for any report table shape. Ported in spirit from exportReport's csv branch (index.html:5030+). */
export function reportRowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: unknown) => {
    const s = String(v ?? "")
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n")
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
