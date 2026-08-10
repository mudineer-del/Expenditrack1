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
