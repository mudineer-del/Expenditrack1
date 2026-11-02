import { wellAfeRate, type WellAfe } from "@/types/wellAfe"
import type { WellCostCentre } from "@/types/wellCost"

/** The base code of a cost centre: "DRFD01/02" and "DRFD01" both give "DRFD01". Centres with
 *  the same base code belong to one WBS group. */
export function baseCostCentreCode(costCentre: string): string {
  return (costCentre || "").split("/")[0].trim()
}

/** The WBS code a fund centre rolls up to: its last token with any "/nn" suffix removed.
 *  "22040AW001E2603 SUJAWAL SOUTH-1 22040AW001E2603-DRFD01/02" gives "22040AW001E2603-DRFD01". */
export function wbsCodeOf(fundCentre: string): string {
  const last = (fundCentre || "").trim().split(/\s+/).pop() ?? ""
  return last.replace(/\/\d+$/, "")
}

/** Groups cost centres by base code, keeping the order each group first appears in. */
export function groupCostCentres(items: WellCostCentre[]): { key: string; items: WellCostCentre[] }[] {
  const groups = new Map<string, WellCostCentre[]>()
  for (const item of items) {
    const key = baseCostCentreCode(item.costCentre) || item.id
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return Array.from(groups, ([key, groupItems]) => ({ key, items: groupItems }))
}

/** Works out each cost centre's budget. Precedence, per centre:
 *  1. A budget override typed into the centre's own dialog.
 *  2. Its WBS group's share of the matching AFE line, split equally across every centre in
 *     the group (e.g. DRFD01, DRFD01/01 and DRFD01/02 share the DRFD01 line).
 *  3. The planned budget entered by hand, when the well has no matching AFE line.
 *  Descriptions follow the same order: a description override, then the AFE line's
 *  description, then the hand-entered one. Hand-entered values stay in manualBudget and
 *  manualDescription, so the dialog can still show and edit them. */
export function applyAfeBudgets(centres: WellCostCentre[], afes: WellAfe[]): WellCostCentre[] {
  // One AFE per well: the Approved one if there is one, otherwise the first.
  const afeByWell = new Map<string, WellAfe>()
  for (const afe of afes) {
    const current = afeByWell.get(afe.wellId)
    if (!current || (afe.status === "Approved" && current.status !== "Approved")) afeByWell.set(afe.wellId, afe)
  }

  const groups = new Map<string, WellCostCentre[]>()
  for (const c of centres) {
    const key = `${c.wellId}|${baseCostCentreCode(c.costCentre) || c.id}`
    groups.set(key, [...(groups.get(key) ?? []), c])
  }

  const shareById = new Map<string, number>()
  const descriptionById = new Map<string, string>()
  for (const members of groups.values()) {
    const { wellId, fundCentre } = members.find((m) => m.fundCentre) ?? members[0]
    const afe = afeByWell.get(wellId)
    const wbs = wbsCodeOf(fundCentre)
    const line = afe && wbs ? afe.lines.find((l) => l.code.trim() === wbs) : undefined
    if (!afe || !line) continue
    if (line.description) members.forEach((m) => descriptionById.set(m.id, line.description))
    const lineTotal = (Number(line.estimate) || 0) + (Number(line.contingency) || 0)
    // Convert from the AFE currency into the currency the centres are kept in, when they differ.
    const toCentres = (c: WellCostCentre) => (c.currency === afe.currency || c.currency !== afe.preferredCurrency ? 1 : wellAfeRate(afe))
    members.forEach((m) => shareById.set(m.id, (lineTotal * toCentres(m)) / members.length))
  }

  return centres.map((c) => {
    const manual = c.plannedBudget
    const share = shareById.get(c.id)
    const budget = c.budgetOverride !== "" ? Number(c.budgetOverride) : share ?? manual
    const afeDescription = descriptionById.get(c.id)
    const description = c.descriptionOverride || afeDescription || c.description
    return { ...c, manualBudget: manual, plannedBudget: budget, manualDescription: c.description, description }
  })
}
