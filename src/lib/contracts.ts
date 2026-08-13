import type { Invoice } from "@/types/invoice"

function normContract(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase()
}

/** Ported from invoicesForContract (index.html:2417-2420). */
export function invoicesForContract(invoices: Invoice[], contractNo: string): Invoice[] {
  const key = normContract(contractNo)
  return invoices.filter((r) => normContract(r.contractNo) === key)
}

/** Ported from contractExpenditure (index.html:2433-2435). */
export function contractExpenditure(invoices: Invoice[], contractNo: string): number {
  return invoicesForContract(invoices, contractNo).reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
}

export type ContractTone = "cleared" | "under" | "returned" | "other"

/** Ported from contractStatusClass (index.html:2282-2289), mapped to the same badge tones as invoice status. */
export function contractStatusTone(status: string | null | undefined): ContractTone {
  if (!status) return "other"
  const s = status.toLowerCase()
  if (s.includes("active")) return "cleared"
  if (s.includes("expir") || s.includes("closed") || s.includes("terminat")) return "returned"
  if (s.includes("pending") || s.includes("draft") || s.includes("review")) return "under"
  return "other"
}

export const CONTRACT_STATUS_OPTIONS = ["Active", "Pending", "Under Review", "Expired", "Terminated", "Closed"]

/** Shared by every place a contract's status shows as a colored pill (row, detail sheet, sidebar widget). */
export const CONTRACT_TONE_CLASSES: Record<ContractTone, string> = {
  cleared: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  under: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  returned: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  other: "bg-muted text-muted-foreground",
}

/** Days until (positive) or since (negative) a contract's end date; null if there isn't one on file. */
export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.round((d.getTime() - Date.now()) / 86400000)
}

/** Traffic-light color for a contract's spend-vs-value utilization bar. */
export function utilizationColor(pct: number): string {
  return pct >= 90 ? "#c23b3b" : pct >= 70 ? "#c8781c" : "#1c8a4b"
}
