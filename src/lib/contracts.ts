import { shortContract } from "@/lib/reports"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"

function normContract(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase()
}

/** contractNo -> vendor, built from actual Contract records first (authoritative), then
 *  falling back to whichever vendor an invoice referencing that contract number carries —
 *  covers contract numbers that only exist via imported invoices, with no matching
 *  Contract record created yet in Vendors & Contracts. */
export function buildContractVendorMap(contracts: Contract[], invoices: Invoice[]): Record<string, string> {
  const map: Record<string, string> = {}
  contracts.forEach((c) => {
    if (c.contractNo && c.vendor) map[c.contractNo] = c.vendor
  })
  invoices.forEach((r) => {
    const key = (r.contractNo || "").trim()
    if (key && !map[key] && r.vendor) map[key] = r.vendor
  })
  return map
}

/** "CONTRACT-NO — Vendor" label for a Contract No. dropdown option, so it's clear at a
 *  glance which contractor a contract number belongs to. Falls back to the bare contract
 *  number if no vendor is known for it. Uses shortContract's tail-truncation for the
 *  number itself — OGDCL's contract numbers run 50+ characters, and without shortening,
 *  a long number plus a long vendor name overflows the fixed-width Select controls that
 *  render these options (see src/lib/reports.ts's shortContract). */
export function contractOptionLabel(contractNo: string, vendorMap: Record<string, string>): string {
  const vendor = vendorMap[contractNo]
  return vendor ? `${shortContract(contractNo)} — ${vendor}` : contractNo
}

/** Ready-to-render contractNo -> label map (see contractOptionLabel), built in one call
 *  for a list of contract numbers — the shape every Contract No. dropdown consumes. */
export function buildContractLabels(contractNumbers: string[], contracts: Contract[], invoices: Invoice[]): Record<string, string> {
  const vendorMap = buildContractVendorMap(contracts, invoices)
  return Object.fromEntries(contractNumbers.map((c) => [c, contractOptionLabel(c, vendorMap)]))
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
  cleared: "status-tone-cleared",
  under: "status-tone-under",
  returned: "status-tone-returned",
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
  return pct >= 90 ? "var(--status-returned)" : pct >= 70 ? "var(--status-under)" : "var(--status-cleared)"
}



