import type { Invoice } from "@/types/invoice"

export interface InvoiceFilters {
  q: string
  vendor: string
  service: string
  status: string
  region: string
  year: string
  qtr: string
  contract: string
  enteredBy: string
}

export const BLANK_FILTERS: InvoiceFilters = {
  q: "", vendor: "", service: "", status: "", region: "", year: "", qtr: "", contract: "", enteredBy: "",
}

export interface SortState {
  key: keyof Invoice
  dir: "asc" | "desc"
}

function normContract(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase()
}

/** Ported from filteredInvoices (index.html:2374-2406). */
export function filterAndSortInvoices(invoices: Invoice[], f: InvoiceFilters, sort: SortState): Invoice[] {
  let rows = invoices.slice()
  if (f.q) {
    const q = f.q.toLowerCase()
    const has = (v: unknown) => String(v == null ? "" : v).toLowerCase().includes(q)
    rows = rows.filter(
      (r) =>
        has(r.invoiceNo) || has(r.description) || has(r.vendor) || has(r.location) ||
        has(r.wellName) || has(r.contractNo) || has(r.service) || has(r.type) ||
        has(r.rig) || has(r.region) || has(r.status) || has(r.srNo)
    )
  }
  if (f.vendor) rows = rows.filter((r) => r.vendor === f.vendor)
  if (f.service) rows = rows.filter((r) => r.service === f.service)
  if (f.status) rows = rows.filter((r) => r.status === f.status)
  if (f.region) rows = rows.filter((r) => r.region === f.region)
  if (f.contract) rows = rows.filter((r) => normContract(r.contractNo) === normContract(f.contract))
  if (f.year) rows = rows.filter((r) => String(r.year) === String(f.year) || String(r.yr) === String(f.year))
  if (f.qtr) rows = rows.filter((r) => r.qtr === f.qtr)
  if (f.enteredBy) rows = rows.filter((r) => r.createdByName === f.enteredBy)

  const { key, dir } = sort
  rows.sort((a, b) => {
    let va: unknown = a[key]
    let vb: unknown = b[key]
    if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va
    const sa = va === undefined || va === null ? "" : String(va)
    const sb = vb === undefined || vb === null ? "" : String(vb)
    return dir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa)
  })
  return rows
}
