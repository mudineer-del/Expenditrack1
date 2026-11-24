import type { WellCostCentre, WellCostTransaction } from "../types/wellCost.ts"

export const COST_CENTRE_EXPORT_HEADERS = [
  "Cost Centre",
  "Fund Centre",
  "Date",
  "Type",
  "Amount",
  "Currency",
  "Notes",
  "Remarks",
  "Logged By",
]

/** CSV cell: quoted when it holds a comma, quote or line break, with quotes doubled. */
function csvCell(v: string | number): string {
  const s = String(v ?? "")
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")
}

/** CSV of every entry on one cost centre, oldest first, with a total row per type. Amounts are
 *  plain numbers so the file opens cleanly in Excel. */
export function buildCostCentreCsv(centre: WellCostCentre, entries: WellCostTransaction[]): string {
  const currency = centre.currency || "USD"
  const fund = centre.fundCentre || ""
  const sorted = [...entries].sort((a, b) => a.entryDate.localeCompare(b.entryDate))
  const rows: (string | number)[][] = sorted.map((e) => [
    centre.costCentre,
    fund,
    e.entryDate,
    e.kind === "actual" ? "Actual" : "Commitment",
    Number(e.amount) || 0,
    currency,
    e.notes || "",
    (e.remarks || "").replace(/\s*\n\s*/g, " "),
    e.createdByName || "",
  ])
  const total = (kind: "actual" | "commitment") =>
    Math.round(entries.filter((e) => e.kind === kind).reduce((s, e) => s + (Number(e.amount) || 0), 0) * 100) / 100
  rows.push([])
  rows.push([centre.costCentre, fund, "", "Total actual", total("actual"), currency, "", "", ""])
  rows.push([centre.costCentre, fund, "", "Total commitment", total("commitment"), currency, "", "", ""])
  return "﻿" + toCsv(COST_CENTRE_EXPORT_HEADERS, rows)
}

/** Downloads one cost centre's entries as <cost centre>_costs_<yyyy-mm-dd>.csv. */
export function exportCostCentreCsv(centre: WellCostCentre, entries: WellCostTransaction[]) {
  const stamp = new Date().toISOString().slice(0, 10)
  const safe = centre.costCentre.replace(/[^A-Za-z0-9_-]+/g, "_")
  const url = URL.createObjectURL(new Blob([buildCostCentreCsv(centre, entries)], { type: "text/csv;charset=utf-8;" }))
  const a = document.createElement("a")
  a.href = url
  a.download = `${safe}_costs_${stamp}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
