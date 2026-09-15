import type { WellCostCentre, WellCostDepartment, WellCostServiceCategory, WellCostTransaction } from "@/types/wellCost"
import type { WellMilestone } from "@/types/wellMilestone"

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
export function fmtCurrency(amount: number | "" | null | undefined, currency: string, fractionDigits = 0): string {
  const v = Number(amount) || 0
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(v)
  } catch {
    return `${(currency || "USD").toUpperCase()} ${v.toLocaleString("en-US", { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}`
  }
}

export interface CostCentreTotals {
  actual: number
  commitment: number
}

export const ZERO_TOTALS: CostCentreTotals = { actual: 0, commitment: 0 }

export function budgetStatus(budget: number, spent: number): string {
  if (budget <= 0) return spent > 0 ? "Spend without budget" : "No budget"
  // Compare cents so floating-point addition does not create a false overrun.
  const difference = Math.round(spent * 100) - Math.round(budget * 100)
  return difference > 0 ? "Over budget" : difference === 0 ? "At budget" : "Within budget"
}

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

export interface MonthlySpendPoint {
  /** "2026-06" — sorts correctly as a plain string, formatted for display by the caller. */
  monthKey: string
  monthLabel: string
  actual: number
  commitment: number
}

/** Every well_cost_transactions entry (across whichever cost centres the caller already
 *  filtered to — see WellDashboardPage, which passes every non-archived well's centres)
 *  bucketed by calendar month, for the portfolio-wide "Monthly Spend Trend" chart. Months
 *  with no entries at all are never synthesized — only real activity produces a bar. */
export function buildMonthlySpendSeries(transactions: WellCostTransaction[]): MonthlySpendPoint[] {
  const byMonth = new Map<string, MonthlySpendPoint>()
  for (const t of transactions) {
    if (!t.entryDate) continue
    const monthKey = t.entryDate.slice(0, 7)
    const point = byMonth.get(monthKey) ?? {
      monthKey,
      monthLabel: new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: "UTC" }),
      actual: 0,
      commitment: 0,
    }
    if (t.kind === "commitment") point.commitment += Number(t.amount) || 0
    else point.actual += Number(t.amount) || 0
    byMonth.set(monthKey, point)
  }
  return Array.from(byMonth.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey))
}

export interface CategoryCostBreakdown {
  id: string
  name: string
  budget: number
  actual: number
  commitment: number
}

/** Rolls a set of cost centres up by whichever grouping key `keyOf` picks (department id
 *  or service-category id) — shared by the "Cost by Department" and "Cost by Service"
 *  charts, which differ only in which id they group by and which catalog they label from. */
function breakdownBy(
  costCentres: WellCostCentre[],
  totals: Record<string, CostCentreTotals>,
  keyOf: (c: WellCostCentre) => string,
  labelOf: (key: string) => string
): CategoryCostBreakdown[] {
  const byKey = new Map<string, CategoryCostBreakdown>()
  for (const c of costCentres) {
    const key = keyOf(c)
    const entry = byKey.get(key) ?? { id: key, name: labelOf(key), budget: 0, actual: 0, commitment: 0 }
    entry.budget += Number(c.plannedBudget) || 0
    const t = totals[c.id] ?? ZERO_TOTALS
    entry.actual += t.actual
    entry.commitment += t.commitment
    byKey.set(key, entry)
  }
  return Array.from(byKey.values()).sort((a, b) => b.actual + b.commitment - (a.actual + a.commitment))
}

export function buildDepartmentBreakdown(
  costCentres: WellCostCentre[],
  totals: Record<string, CostCentreTotals>,
  departments: WellCostDepartment[]
): CategoryCostBreakdown[] {
  const nameById = new Map(departments.map((d) => [d.id, d.name]))
  return breakdownBy(costCentres, totals, (c) => c.departmentId, (id) => nameById.get(id) ?? "Unknown")
}

export function buildServiceCategoryBreakdown(
  costCentres: WellCostCentre[],
  totals: Record<string, CostCentreTotals>,
  serviceCategories: WellCostServiceCategory[]
): CategoryCostBreakdown[] {
  const nameById = new Map(serviceCategories.map((s) => [s.id, s.name]))
  return breakdownBy(costCentres, totals, (c) => c.serviceCategoryId, (id) => nameById.get(id) ?? "Unknown")
}

export interface ServiceCatalogRow extends CategoryCostBreakdown {
  departmentName: string
  available: number
  utilizationPct: number
}

/** Every service category in the catalog — Drilling Fluids, Cementation, Directional
 *  Drilling, and so on — with its rolled-up cost across every well, even ones that don't
 *  have a single cost centre logged against them anywhere yet (those just come back at
 *  $0). buildServiceCategoryBreakdown() by contrast only returns categories that already
 *  have at least one cost centre, which is right for a spend-share donut (nothing to show
 *  a $0 slice of) but wrong for a full catalog summary — the point here is to surface the
 *  services nobody's touched yet, not just the ones already in use. Sorted by department
 *  then service in the catalog's own seeded order (well_cost_setup.sql), so it reads like
 *  the same department groupings the Cost Structure page's tabs use. */
export function buildServiceCatalogSummary(
  costCentres: WellCostCentre[],
  totals: Record<string, CostCentreTotals>,
  serviceCategories: WellCostServiceCategory[],
  departments: WellCostDepartment[]
): ServiceCatalogRow[] {
  const deptById = new Map(departments.map((d) => [d.id, d]))
  const byServiceId = new Map<string, { budget: number; actual: number; commitment: number }>()
  for (const c of costCentres) {
    const entry = byServiceId.get(c.serviceCategoryId) ?? { budget: 0, actual: 0, commitment: 0 }
    entry.budget += Number(c.plannedBudget) || 0
    const t = totals[c.id] ?? ZERO_TOTALS
    entry.actual += t.actual
    entry.commitment += t.commitment
    byServiceId.set(c.serviceCategoryId, entry)
  }

  return serviceCategories
    .map((svc) => {
      const dept = deptById.get(svc.departmentId)
      const sums = byServiceId.get(svc.id) ?? { budget: 0, actual: 0, commitment: 0 }
      return {
        id: svc.id,
        name: svc.name,
        departmentName: dept?.name ?? "Unknown",
        deptSortOrder: dept?.sortOrder ?? 0,
        svcSortOrder: svc.sortOrder,
        budget: sums.budget,
        actual: sums.actual,
        commitment: sums.commitment,
        available: sums.budget - sums.actual - sums.commitment,
        utilizationPct: sums.budget > 0 ? ((sums.actual + sums.commitment) / sums.budget) * 100 : 0,
      }
    })
    .sort((a, b) => a.deptSortOrder - b.deptSortOrder || a.svcSortOrder - b.svcSortOrder)
    .map(({ deptSortOrder: _deptSortOrder, svcSortOrder: _svcSortOrder, ...row }) => row)
}

export interface WellPhaseCost {
  id: string
  order: number
  /** "Spud → 13-3/8in Casing" for a bounded phase, "To Spud" for the first, "Since TD" for
   *  the open-ended one after the last milestone. */
  label: string
  /** Just the milestone that ends this phase — "13-3/8in Casing" — used when comparing the
   *  same phase rank across multiple wells, where the full range label rarely matches. */
  boundaryLabel: string
  startDate: string | null
  endDate: string | null
  usesPlannedDate: boolean
  actualDepth: number | ""
  actual: number
  commitment: number
}

interface PhaseBoundary {
  label: string
  date: string
  sortOrder: number
  actualDepth: number | ""
  usesPlannedDate: boolean
}

/** Only a milestone with a usable date (actual, falling back to planned) can bound a
 *  phase — undated well_milestones rows (label filled in ahead of the date being known)
 *  are skipped rather than guessed at. Sorted by that date, sortOrder breaking ties. */
function wellPhaseBoundaries(milestones: WellMilestone[]): PhaseBoundary[] {
  return milestones
    .map((m) => ({ label: m.label || "Milestone", date: m.actualDate || m.plannedDate, sortOrder: m.sortOrder, actualDepth: m.actualDepth, usesPlannedDate: !m.actualDate }))
    .filter((m): m is PhaseBoundary => !!m.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder)
}

/** Breaks one well's cost down by drilling phase/section — the stretches of time between
 *  consecutive well_milestones entries (Spud, casing points, section TDs, cementation, and
 *  so on), so "how much did the 13-3/8in section cost" has an answer instead of only "how
 *  much did this well cost in total." Phase N's cost is every well_cost_transactions entry
 *  (via this well's own cost centres) whose entryDate falls on or before the Nth milestone
 *  date and after the (N-1)th; the open-ended phase after the last milestone catches
 *  whatever's ongoing. Wells with fewer than one dated milestone have no phases to show —
 *  callers should prompt to log Well Data (see WellMilestoneDrawer) instead of rendering
 *  an empty chart. */
export function buildWellPhaseCosts(
  wellId: string,
  milestones: WellMilestone[],
  costCentres: WellCostCentre[],
  transactions: WellCostTransaction[]
): WellPhaseCost[] {
  const boundaries = wellPhaseBoundaries(milestones.filter((m) => m.wellId === wellId))
  if (!boundaries.length) return []

  const centreIds = new Set(costCentres.filter((c) => c.wellId === wellId).map((c) => c.id))
  const wellTx = transactions.filter((t) => centreIds.has(t.costCentreId) && t.entryDate)

  const phases: WellPhaseCost[] = boundaries.map((b, i) => ({
    id: `${wellId}-phase-${i + 1}`,
    order: i + 1,
    label: i === 0 ? `To ${b.label}` : `${boundaries[i - 1].label} → ${b.label}`,
    boundaryLabel: b.label,
    startDate: i === 0 ? null : boundaries[i - 1].date,
    endDate: b.date,
    usesPlannedDate: b.usesPlannedDate || (i > 0 && boundaries[i - 1].usesPlannedDate),
    actualDepth: b.actualDepth,
    actual: 0,
    commitment: 0,
  }))
  const lastLabel = boundaries[boundaries.length - 1].label
  const finalPhase: WellPhaseCost = {
    id: `${wellId}-phase-${boundaries.length + 1}`,
    order: boundaries.length + 1,
    label: `Since ${lastLabel}`,
    boundaryLabel: "Ongoing",
    startDate: boundaries[boundaries.length - 1].date,
    endDate: null,
    usesPlannedDate: boundaries[boundaries.length - 1].usesPlannedDate,
    actualDepth: "",
    actual: 0,
    commitment: 0,
  }

  for (const t of wellTx) {
    const target = phases.find((p) => t.entryDate <= (p.endDate as string)) ?? finalPhase
    if (t.kind === "commitment") target.commitment += Number(t.amount) || 0
    else target.actual += Number(t.amount) || 0
  }

  return [...phases, finalPhase]
}

export interface PhaseRankSummary {
  order: number
  label: string
  actual: number
  commitment: number
  wellCount: number
}

/** Aggregates buildWellPhaseCosts() across several wells by phase RANK (1st, 2nd, 3rd...)
 *  rather than by each well's own milestone labels, since two wells' 2nd phase is rarely
 *  the same casing size — this answers "how does everyone's Nth section compare," not "how
 *  does the 13-3/8in section compare." The label only names a milestone once every well in
 *  the set agrees what its Nth one was; otherwise it falls back to a plain "Phase N". */
export function buildPhaseRankSummary(perWellPhases: WellPhaseCost[][]): PhaseRankSummary[] {
  const byOrder = new Map<number, { actual: number; commitment: number; labels: Map<string, number> }>()
  for (const phases of perWellPhases) {
    for (const p of phases) {
      const bucket = byOrder.get(p.order) ?? { actual: 0, commitment: 0, labels: new Map<string, number>() }
      bucket.actual += p.actual
      bucket.commitment += p.commitment
      bucket.labels.set(p.boundaryLabel, (bucket.labels.get(p.boundaryLabel) ?? 0) + 1)
      byOrder.set(p.order, bucket)
    }
  }
  return Array.from(byOrder.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([order, b]) => {
      let bestLabel = "Ongoing"
      let bestCount = -1
      let wellCount = 0
      b.labels.forEach((count, label) => {
        wellCount += count
        if (count > bestCount) {
          bestCount = count
          bestLabel = label
        }
      })
      const label = bestCount === wellCount && wellCount > 0 ? `Phase ${order} — ${bestLabel}` : `Phase ${order}`
      return { order, label, actual: b.actual, commitment: b.commitment, wellCount }
    })
}
