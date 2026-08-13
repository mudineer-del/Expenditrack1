import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

/** Ported from VENDOR_COLORS (index.html:2986). */
const VENDOR_COLORS: Record<string, string> = {
  "Step Oiltools": "#0A86C8",
  Schlumbergers: "#49BFAC",
  Hilong: "#c8781c",
  Gemstone: "#1c8a4b",
  Sprint: "#7a5fc9",
  "Mid Gard": "#c25577",
}
const FALLBACK_VENDOR_COLORS = ["#5b7086", "#3d8f84", "#8b5cf6", "#c23b3b", "#155a82", "#2f9e94"]

/** Simple deterministic string hash so a vendor not in VENDOR_COLORS still gets
 *  the same fallback color everywhere it's shown, instead of always the first one. */
function hashVendor(v: string): number {
  let h = 0
  for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** `index` is an explicit override for callers (like a chart legend) that need
 *  guaranteed-distinct colors among a specific set of vendors shown together;
 *  omit it and the color is derived from the vendor's own name instead. */
export function vendorColor(v: string, index?: number): string {
  if (VENDOR_COLORS[v]) return VENDOR_COLORS[v]
  const i = index ?? hashVendor(v)
  return FALLBACK_VENDOR_COLORS[i % FALLBACK_VENDOR_COLORS.length]
}

export function fmtMoney(n: number | "" | null | undefined): string {
  const v = Number(n) || 0
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Ported from statusClass (index.html:2292-2299) mapped to a badge tone. */
export type StatusTone = "cleared" | "under" | "returned" | "other"

export function statusTone(s: string | null | undefined): StatusTone {
  if (!s) return "other"
  const v = s.toLowerCase()
  if (v.includes("cleared") || v.includes("received")) return v.includes("deduction") ? "under" : "cleared"
  if (v.includes("under") || v.includes("sent") || v.includes("budgeting")) return "under"
  if (v.includes("returned") || v.includes("not created")) return "returned"
  return "other"
}

function daysBetween(a: string, b: string): number | null {
  if (!a || !b) return null
  const d1 = new Date(a)
  const d2 = new Date(b)
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null
  return Math.round((d2.getTime() - d1.getTime()) / 86400000)
}

/** Ported from avgLeadTime (index.html:2312-2317). */
export function avgLeadTime(rows: Invoice[]): number | null {
  const vals = rows
    .map((r) => daysBetween(r.receivingDate, r.clearanceDate))
    .filter((d): d is number => d !== null && d >= 0)
  if (!vals.length) return null
  return Math.round(vals.reduce((s, d) => s + d, 0) / vals.length)
}

export interface Kpis {
  count: number
  totalIncl: number
  totalPaid: number
  outstanding: number
  cleared: number
  pending: number
}

/** Ported from kpis (index.html:2408-2415). */
export function kpis(rows: Invoice[]): Kpis {
  const totalIncl = rows.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
  const totalPaid = rows.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0)
  const cleared = rows.filter((r) => (r.status || "").toLowerCase().includes("cleared")).length
  const pending = rows.filter((r) => {
    const s = (r.status || "").toLowerCase()
    return s.includes("under") || s.includes("sent") || s.includes("budget")
  }).length
  return { count: rows.length, totalIncl, totalPaid, outstanding: totalIncl - totalPaid, cleared, pending }
}

function fyKey(yr: string, qtr: string): number | null {
  if (!yr || !qtr) return null
  const startYear = parseInt(String(yr).split("-")[0], 10)
  const q = parseInt(String(qtr).replace(/[^0-9]/g, ""), 10)
  if (isNaN(startYear) || isNaN(q)) return null
  return startYear * 4 + (q - 1)
}

export interface DashboardStats {
  k: Kpis
  qoqPct: number | null
  thisQTotal: number
  latestQtrStr: string | null
  latestQtrYr: string | null
  yoyPct: number | null
  ytdTotal: number
  latestYr: string | null
  avgInvoiceValue: number
  avgDaysToClear: number | null
  clearDaysCount: number
  topVendor: [string, number] | null
  topVendorPct: number | null
  activeContracts: Contract[]
  expiringSoon: number
  storyText: string
}

/** Ported from the KPI-calculation block inside renderDashboard (index.html:3016-3115). */
export function computeDashboardStats(rows: Invoice[], contracts: Contract[]): DashboardStats {
  const k = kpis(rows)

  let latestQKey: number | null = null
  let latestQtrStr: string | null = null
  let latestQtrYr: string | null = null
  rows.forEach((r) => {
    const key = fyKey(r.yr, r.qtr)
    if (key != null && (latestQKey === null || key > latestQKey)) {
      latestQKey = key
      latestQtrStr = r.qtr
      latestQtrYr = r.yr
    }
  })
  let thisQTotal = 0
  let lastQTotal = 0
  if (latestQKey != null) {
    rows.forEach((r) => {
      const key = fyKey(r.yr, r.qtr)
      if (key === latestQKey) thisQTotal += Number(r.amountInclTax) || 0
      else if (key === (latestQKey as number) - 1) lastQTotal += Number(r.amountInclTax) || 0
    })
  }
  const qoqPct = lastQTotal > 0 ? ((thisQTotal - lastQTotal) / lastQTotal) * 100 : null

  let latestYr: string | null = null
  let latestYrStart = -1
  rows.forEach((r) => {
    if (!r.yr) return
    const sy = parseInt(String(r.yr).split("-")[0], 10)
    if (!isNaN(sy) && sy > latestYrStart) {
      latestYrStart = sy
      latestYr = r.yr
    }
  })
  const prevYr = latestYr ? latestYrStart - 1 + "-" + latestYrStart : null
  let ytdTotal = 0
  let lastYrTotal = 0
  if (latestYr) {
    rows.forEach((r) => {
      if (r.yr === latestYr) ytdTotal += Number(r.amountInclTax) || 0
      else if (r.yr === prevYr) lastYrTotal += Number(r.amountInclTax) || 0
    })
  }
  const yoyPct = lastYrTotal > 0 ? ((ytdTotal - lastYrTotal) / lastYrTotal) * 100 : null

  const avgInvoiceValue = k.count > 0 ? k.totalIncl / k.count : 0

  let clearDaysSum = 0
  let clearDaysCount = 0
  rows.forEach((r) => {
    if (!r.invoiceDate || !r.clearanceDate) return
    const d1 = new Date(r.invoiceDate)
    const d2 = new Date(r.clearanceDate)
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return
    const days = (d2.getTime() - d1.getTime()) / 86400000
    if (days >= 0 && days < 3650) {
      clearDaysSum += days
      clearDaysCount++
    }
  })
  const avgDaysToClear = clearDaysCount > 0 ? clearDaysSum / clearDaysCount : null

  const byVendorTotal: Record<string, number> = {}
  rows.forEach((r) => {
    const v = r.vendor || "Unknown"
    byVendorTotal[v] = (byVendorTotal[v] || 0) + (Number(r.amountInclTax) || 0)
  })
  const vendorPairs = Object.entries(byVendorTotal).sort((a, b) => b[1] - a[1])
  const topVendor = vendorPairs[0] || null
  const topVendorPct = topVendor && k.totalIncl > 0 ? (topVendor[1] / k.totalIncl) * 100 : null

  const todayD = new Date()
  const activeContracts = contracts.filter((c) => c.status === "Active")
  const expiringSoon = activeContracts.filter((c) => {
    if (!c.endDate) return false
    const end = new Date(c.endDate)
    if (isNaN(end.getTime())) return false
    const daysLeft = Math.round((end.getTime() - todayD.getTime()) / 86400000)
    return daysLeft >= 0 && daysLeft <= 30
  }).length

  let storyText: string
  if (topVendor && k.count > 0) {
    const trendPhrase =
      qoqPct != null
        ? qoqPct >= 0
          ? `climbed ${Math.abs(qoqPct).toFixed(0)}% this quarter`
          : `eased ${Math.abs(qoqPct).toFixed(0)}% this quarter`
        : yoyPct != null
          ? yoyPct >= 0
            ? `is up ${Math.abs(yoyPct).toFixed(0)}% this fiscal year`
            : `is down ${Math.abs(yoyPct).toFixed(0)}% this fiscal year`
          : "is being tracked"
    storyText =
      `Expenditure ${trendPhrase}, with ${topVendor[0]} driving ${(topVendorPct || 0).toFixed(0)}% of total spend` +
      (expiringSoon > 0 ? `, and ${expiringSoon} contract${expiringSoon !== 1 ? "s" : ""} nearing expiry.` : ".")
  } else {
    storyText = `Tracking ${k.count.toLocaleString()} invoices worth ${fmtMoney(k.totalIncl)} across ${new Set(rows.map((r) => r.vendor)).size} contractors.`
  }

  return {
    k,
    qoqPct,
    thisQTotal,
    latestQtrStr,
    latestQtrYr,
    yoyPct,
    ytdTotal,
    latestYr,
    avgInvoiceValue,
    avgDaysToClear,
    clearDaysCount,
    topVendor,
    topVendorPct,
    activeContracts,
    expiringSoon,
    storyText,
  }
}

/** Ported from vendorContractCost (index.html:2995-3000). */
export function vendorContractCost(contracts: Contract[], vendor: string): number {
  return contracts
    .filter((c) => (c.vendor || "").toLowerCase().includes(vendor.toLowerCase()))
    .reduce((s, c) => s + (Number(c.value) || 0), 0)
}

const REF_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** Monthly expenditure trend, for the Recharts line/bar chart. */
export function monthlyTrend(rows: Invoice[]): { month: string; total: number }[] {
  const byMonth: Record<string, number> = {}
  rows.forEach((r) => {
    const d = r.invoiceDate
    if (d && /^\d{4}-\d{2}/.test(d)) {
      const k = d.slice(0, 7)
      byMonth[k] = (byMonth[k] || 0) + (Number(r.amountInclTax) || 0)
    }
  })
  return Object.keys(byMonth)
    .sort()
    .map((k) => {
      const [y, m] = k.split("-")
      return { month: `${REF_MONTHS[Number(m) - 1].slice(0, 3)} ${y.slice(2)}`, total: byMonth[k] }
    })
}

/** Expenditure by service, for the Recharts bar chart. */
export function serviceBreakdown(rows: Invoice[]): { service: string; total: number }[] {
  const byService: Record<string, number> = {}
  rows.forEach((r) => {
    const s = r.service || "Unspecified"
    byService[s] = (byService[s] || 0) + (Number(r.amountInclTax) || 0)
  })
  return Object.entries(byService)
    .sort((a, b) => b[1] - a[1])
    .map(([service, total]) => ({ service, total }))
}

/** Expenditure by vendor, for the Recharts bar chart. */
export function vendorBreakdown(rows: Invoice[]): { vendor: string; total: number }[] {
  const byVendor: Record<string, number> = {}
  rows.forEach((r) => {
    const v = r.vendor || "Unknown"
    byVendor[v] = (byVendor[v] || 0) + (Number(r.amountInclTax) || 0)
  })
  return Object.entries(byVendor)
    .sort((a, b) => b[1] - a[1])
    .map(([vendor, total]) => ({ vendor, total }))
}
