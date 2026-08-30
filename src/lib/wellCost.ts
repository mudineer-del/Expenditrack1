import type { WellCostCentre, WellCostTransaction } from "@/types/wellCost"

export const WELL_STATUS_OPTIONS = ["Planned", "Active", "Completed", "Suspended"]

export type WellStatusTone = "cleared" | "under" | "returned" | "other"

/** Reuses the same status-tone-* classes as CONTRACT_TONE_CLASSES (lib/contracts.ts). */
export function wellStatusTone(status: string | null | undefined): WellStatusTone {
  if (!status) return "other"
  const s = status.toLowerCase()
  if (s.includes("active")) return "cleared"
  if (s.includes("planned")) return "under"
  if (s.includes("suspend")) return "returned"
  return "other"
}

export const WELL_STATUS_TONE_CLASSES: Record<WellStatusTone, string> = {
  cleared: "status-tone-cleared",
  under: "status-tone-under",
  returned: "status-tone-returned",
  other: "bg-muted text-muted-foreground",
}

export const CURRENCY_OPTIONS = ["USD", "PKR", "EUR", "GBP", "AED", "SAR"]

/** Formats via Intl's currency machinery rather than hardcoded symbols, so any ISO 4217
 *  code in CURRENCY_OPTIONS (or added there later) renders correctly with no extra code. */
export function fmtCurrency(amount: number | "" | null | undefined, currency: string): string {
  const v = Number(amount) || 0
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(v)
  } catch {
    return `${(currency || "USD").toUpperCase()} ${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  }
}

export interface CostCentreTotals {
  actual: number
  commitment: number
}

export const ZERO_TOTALS: CostCentreTotals = { actual: 0, commitment: 0 }

/** Cost centre id -> {actual, commitment}, summed from its dated well_cost_transactions
 *  entries — the ledger those get logged into day by day. This is the one place
 *  Actual/Commitments are computed; nothing else should sum transactions by hand. */
export function buildCostCentreTotals(transactions: WellCostTransaction[]): Record<string, CostCentreTotals> {
  const totals: Record<string, CostCentreTotals> = {}
  transactions.forEach((t) => {
    const bucket = (totals[t.costCentreId] ??= { actual: 0, commitment: 0 })
    if (t.kind === "commitment") bucket.commitment += Number(t.amount) || 0
    else bucket.actual += Number(t.amount) || 0
  })
  return totals
}

/** Budget − Actual − Commitments — the "how much is left" figure shown on every cost
 *  centre row and rolled up at the department/well level. */
export function availableAmount(plannedBudget: number, totals: CostCentreTotals): number {
  return (Number(plannedBudget) || 0) - totals.actual - totals.commitment
}

export interface CostRollup {
  budget: number
  actual: number
  commitments: number
  available: number
  utilizationPct: number
}

/** Sums a set of cost centres into the four headline figures plus utilization —
 *  (Actual + Commitments) / Budget * 100 — used for both the well-level summary and
 *  each department tab's summary, just over a different (optionally filtered) subset.
 *  `totals` is the whole app's cost-centre-id -> {actual, commitment} map (see
 *  buildCostCentreTotals) — passed in rather than transactions directly so callers only
 *  build it once and every rollup() call here just does cheap lookups into it. */
export function rollup(items: WellCostCentre[], totals: Record<string, CostCentreTotals>): CostRollup {
  const budget = items.reduce((s, i) => s + (Number(i.plannedBudget) || 0), 0)
  const actual = items.reduce((s, i) => s + (totals[i.id] ?? ZERO_TOTALS).actual, 0)
  const commitments = items.reduce((s, i) => s + (totals[i.id] ?? ZERO_TOTALS).commitment, 0)
  return {
    budget,
    actual,
    commitments,
    available: budget - actual - commitments,
    utilizationPct: budget > 0 ? ((actual + commitments) / budget) * 100 : 0,
  }
}

/** Service-category id -> its cost centre rows, for a department tab's grouped display. */
export function groupByServiceCategory(items: WellCostCentre[]): Record<string, WellCostCentre[]> {
  const grouped: Record<string, WellCostCentre[]> = {}
  items.forEach((item) => {
    grouped[item.serviceCategoryId] = grouped[item.serviceCategoryId] || []
    grouped[item.serviceCategoryId].push(item)
  })
  return grouped
}
