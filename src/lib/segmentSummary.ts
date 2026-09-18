import { avgLeadTime, fmtMoney, kpis } from "@/lib/dashboard"
import type { Invoice } from "@/types/invoice"

export interface SegmentBreakdownEntry {
  name: string
  total: number
  share: number
}

export interface InvoiceSegmentSummary {
  count: number
  totalIncl: number
  totalPaid: number
  outstanding: number
  avgValue: number
  cleared: number
  pending: number
  returned: number
  avgLead: number | null
  dateRange: { from: string; to: string } | null
  topVendor: SegmentBreakdownEntry | null
  topService: SegmentBreakdownEntry | null
  /** Ready-to-render prose, one paragraph per sentence — a plain-English account of the
   *  segment a chart click drilled into, so a click surfaces a real summary rather than
   *  just a bare row list. */
  sentences: string[]
}

function fmtDate(d: string): string {
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

/** Biggest-share vendor or service within a set of invoices, by value — null when there's
 *  nothing to contrast (0 or 1 distinct group), since "X is 100% of the value" tells you
 *  nothing you didn't already know from the segment's own title. */
function topGroupBy(rows: Invoice[], key: "vendor" | "service", totalIncl: number): SegmentBreakdownEntry | null {
  const totals = new Map<string, number>()
  for (const r of rows) {
    const name = (r[key] || "Unspecified").trim() || "Unspecified"
    totals.set(name, (totals.get(name) ?? 0) + (Number(r.amountInclTax) || 0))
  }
  if (totals.size < 2) return null
  let top: SegmentBreakdownEntry | null = null
  totals.forEach((total, name) => {
    if (!top || total > top.total) top = { name, total, share: totalIncl > 0 ? total / totalIncl : 0 }
  })
  return top
}

/** Turns a flat list of invoices (whatever a chart click drilled into) into a descriptive,
 *  narrated summary — count/total/average, paid vs. outstanding, status mix, the biggest
 *  contractor and service by value, and average turnaround — instead of just a bare row
 *  list with nothing to read. Every dashboard/report drill-down dialog shares this. */
export function buildInvoiceSegmentSummary(rows: Invoice[]): InvoiceSegmentSummary {
  const { count, totalIncl, totalPaid, outstanding, cleared, pending } = kpis(rows)
  const returned = rows.filter((r) => (r.status || "").toLowerCase().includes("returned")).length
  const avgValue = count ? totalIncl / count : 0
  const avgLead = avgLeadTime(rows)
  const dates = rows.map((r) => r.invoiceDate).filter(Boolean).sort()
  const dateRange = dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null
  const topVendor = topGroupBy(rows, "vendor", totalIncl)
  const topService = topGroupBy(rows, "service", totalIncl)

  const sentences: string[] = []
  if (count === 0) {
    sentences.push("No invoices fall under this segment.")
    return { count, totalIncl, totalPaid, outstanding, avgValue, cleared, pending, returned, avgLead, dateRange, topVendor, topService, sentences }
  }

  sentences.push(
    `${count} invoice${count !== 1 ? "s" : ""} totaling ${fmtMoney(totalIncl)}` +
      (count > 1 ? ` (averaging ${fmtMoney(avgValue)} each)` : "") +
      (dateRange ? ` between ${fmtDate(dateRange.from)} and ${fmtDate(dateRange.to)}` : "") +
      "."
  )
  if (topVendor) {
    sentences.push(`${topVendor.name} accounts for the largest share — ${Math.round(topVendor.share * 100)}% (${fmtMoney(topVendor.total)}).`)
  }
  if (topService) {
    sentences.push(`${topService.name} is the largest service category at ${Math.round(topService.share * 100)}% (${fmtMoney(topService.total)}).`)
  }
  const paidPct = totalIncl > 0 ? Math.round((totalPaid / totalIncl) * 100) : 0
  sentences.push(
    outstanding > 0.005
      ? `${fmtMoney(totalPaid)} has been paid (${paidPct}%), leaving ${fmtMoney(outstanding)} outstanding.`
      : `${fmtMoney(totalPaid)} has been paid in full.`
  )
  const statusBits: string[] = []
  if (cleared) statusBits.push(`${cleared} cleared`)
  if (pending) statusBits.push(`${pending} under process`)
  if (returned) statusBits.push(`${returned} returned`)
  if (statusBits.length) sentences.push(`Status: ${statusBits.join(", ")}.`)
  if (avgLead !== null) sentences.push(`Average turnaround from receiving to clearance is ${avgLead} day${avgLead !== 1 ? "s" : ""}.`)

  return { count, totalIncl, totalPaid, outstanding, avgValue, cleared, pending, returned, avgLead, dateRange, topVendor, topService, sentences }
}
