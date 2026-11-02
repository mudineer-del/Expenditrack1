import { wellAfeRate, type WellAfe, type WellAfeLine } from "@/types/wellAfe"
import type { WellCostCentre } from "@/types/wellCost"

/** The base code of a cost centre: "DRFD01/02" and "DRFD01" both give "DRFD01". Centres with
 *  the same base code belong to one WBS group. */
export function baseCostCentreCode(costCentre: string): string {
  return (costCentre || "").split("/")[0].trim()
}

/** The WBS code a fund centre rolls up to. Fund centres carry extra text around it, such as a
 *  well name or a label in brackets, so this finds the code itself rather than a word position:
 *  "21014AW004D2601-DRFD01/01 (Kal=-04)" and "22040AW001E2603 SOUTH-1 22040AW001E2603-DRFD01"
 *  both give "21014AW004D2601-DRFD01" and "22040AW001E2603-DRFD01". */
export function wbsCodeOf(fundCentre: string): string {
  const match = (fundCentre || "").match(/[0-9A-Z]{5,}-[A-Z]{2,}\d+/)
  return match ? match[0] : ""
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

/** Position of an AFE in its revision history: Original first, then 1st, 2nd, ... Supplementary,
 *  then Final. Unknown types sort between the supplementaries and Final. */
export function afeTypeRank(afeType: string): number {
  const type = (afeType || "").trim()
  if (type === "Original" || type === "Initial") return 0
  if (type === "Supplementary") return 1
  if (type === "Final") return 1000
  const numbered = type.match(/^(\d+)(st|nd|rd|th) Supplementary$/i)
  if (numbered) return Number(numbered[1])
  return 500
}

/** The column an AFE type belongs to in the budget table: "0" for the Original, "1" to "5" for the
 *  numbered supplementaries (an unnumbered "Supplementary" counts as 1st), "final" for Final. */
export function afeSlotKey(afeType: string): string {
  const rank = afeTypeRank(afeType)
  if (rank === 0) return "0"
  if (rank === 1000) return "final"
  if (rank === 500) return "other"
  return String(rank)
}

/** Column heading for a slot key from afeSlotKey. */
export function afeSlotLabel(key: string): string {
  if (key === "0") return "Original"
  if (key === "final") return "Final"
  if (key === "other") return "Other"
  const n = Number(key)
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"
  return `${n}${suffix} Supplementary`
}

/** A well's AFEs in revision order. */
export function wellAfesOrdered(afes: WellAfe[], wellId: string): WellAfe[] {
  return afes
    .filter((a) => a.wellId === wellId)
    .map((a, i) => ({ a, i }))
    .sort((x, y) => afeTypeRank(x.a.afeType) - afeTypeRank(y.a.afeType) || x.i - y.i)
    .map((x) => x.a)
}

/** One AFE line's total (estimate plus contingency) in the given currency. A line is converted
 *  with the AFE's saved rate when the target currency is the AFE's preferred one; otherwise the
 *  amount is taken as it is. */
export function lineAmountIn(afe: WellAfe, line: WellAfeLine, currency: string): number {
  const amount = (Number(line.estimate) || 0) + (Number(line.contingency) || 0)
  if (currency === afe.currency) return amount
  if (currency === afe.preferredCurrency) return amount * wellAfeRate(afe)
  return amount
}

/** A WBS code's budget across all of a well's AFEs, in the given currency. Supplementary AFEs
 *  add to the original, so the total is the sum over every AFE. The description comes from the
 *  latest revision that has one. Returns null when no AFE has the code. */
export function wbsBudgetFor(afes: WellAfe[], wellId: string, code: string, currency: string): { total: number; description: string } | null {
  if (!code) return null
  let total = 0
  let description = ""
  let matched = false
  for (const afe of wellAfesOrdered(afes, wellId)) {
    for (const line of afe.lines) {
      if (line.code.trim() !== code) continue
      matched = true
      total += lineAmountIn(afe, line, currency)
      if (line.description?.trim()) description = line.description.trim()
    }
  }
  return matched ? { total, description } : null
}

/** Every WBS code on a well's AFEs, with the amount each AFE gives it and the total across them.
 *  Rows keep the order the codes first appear in, Original first. */
export function wbsBreakupRows(
  afes: WellAfe[],
  wellId: string,
  currency: string
): { code: string; description: string; perAfe: Map<string, number>; total: number }[] {
  const rows = new Map<string, { code: string; description: string; perAfe: Map<string, number>; total: number }>()
  for (const afe of wellAfesOrdered(afes, wellId)) {
    for (const line of afe.lines) {
      const code = line.code.trim()
      if (!code) continue
      const row = rows.get(code) ?? { code, description: "", perAfe: new Map<string, number>(), total: 0 }
      const amount = lineAmountIn(afe, line, currency)
      row.perAfe.set(afe.id, (row.perAfe.get(afe.id) ?? 0) + amount)
      row.total += amount
      if (line.description?.trim()) row.description = line.description.trim()
      rows.set(code, row)
    }
  }
  return Array.from(rows.values())
}

/** Works out each cost centre's budget. Precedence, per centre:
 *  1. A budget override typed into the centre's own dialog.
 *  2. Its WBS group's share of the well's AFE budget for that WBS code, summed across all of the
 *     well's AFEs (original plus supplementaries), split equally across the group
 *     (e.g. DRFD01, DRFD01/01 and DRFD01/02 share the DRFD01 code).
 *  3. The planned budget entered by hand, when the well has no matching AFE line.
 *  Descriptions follow the same order: a description override, then the AFE WBS description,
 *  then the hand-entered one. Hand-entered values stay in manualBudget and manualDescription. */
export function applyAfeBudgets(centres: WellCostCentre[], afes: WellAfe[]): WellCostCentre[] {
  const groups = new Map<string, WellCostCentre[]>()
  for (const c of centres) {
    const key = `${c.wellId}|${baseCostCentreCode(c.costCentre) || c.id}`
    groups.set(key, [...(groups.get(key) ?? []), c])
  }

  const shareById = new Map<string, number>()
  const descriptionById = new Map<string, string>()
  for (const members of groups.values()) {
    const { wellId, fundCentre } = members.find((m) => m.fundCentre) ?? members[0]
    const found = wbsBudgetFor(afes, wellId, wbsCodeOf(fundCentre), members[0].currency)
    if (!found) continue
    if (found.description) members.forEach((m) => descriptionById.set(m.id, found.description))
    members.forEach((m) => shareById.set(m.id, found.total / members.length))
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
