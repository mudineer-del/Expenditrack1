export interface Invoice {
  id: string
  srNo: number | ""
  vendor: string
  invoiceNo: string
  contractNo: string
  wellName: string
  invoiceDate: string
  receivingDate: string
  clearanceDate: string
  loginDate: string
  yr: string
  receivingMonth: string
  serviceMonth: string
  qtr: string
  service: string
  type: string
  region: string
  rig: string
  location: string
  year: string
  description: string
  amountExclTax: number | ""
  gstPst: number | ""
  tax: number | ""
  amountInclTax: number | ""
  amountPaid: number | ""
  status: string
  /** Server-stamped (see supabase/invoices_attribution_setup.sql) — not written by toRow(). */
  createdByName?: string
  updatedByName?: string
  updatedAt?: string
}

export type InvoiceRow = Record<string, unknown> & { id: string }

/** camelCase (app) <-> snake_case (Supabase) field mapping. Ported from
 *  the legacy app's SB_FIELDS (index.html:1537-1546). */
const SB_FIELDS: Array<[keyof Invoice, string]> = [
  ["srNo", "sr_no"],
  ["vendor", "vendor"],
  ["invoiceNo", "invoice_no"],
  ["contractNo", "contract_no"],
  ["wellName", "well_name"],
  ["invoiceDate", "invoice_date"],
  ["receivingDate", "receiving_date"],
  ["clearanceDate", "clearance_date"],
  ["loginDate", "login_date"],
  ["yr", "yr"],
  ["receivingMonth", "receiving_month"],
  ["serviceMonth", "service_month"],
  ["qtr", "qtr"],
  ["service", "service"],
  ["type", "type"],
  ["region", "region"],
  ["rig", "rig"],
  ["location", "location"],
  ["year", "year"],
  ["description", "description"],
  ["amountExclTax", "amount_excl_tax"],
  ["gstPst", "gst_pst"],
  ["tax", "tax"],
  ["amountInclTax", "amount_incl_tax"],
  ["amountPaid", "amount_paid"],
  ["status", "status"],
]

const DATE_FIELDS = ["invoice_date", "receiving_date", "clearance_date", "login_date"]
const NUMERIC_FIELDS = ["sr_no", "amount_excl_tax", "gst_pst", "tax", "amount_incl_tax", "amount_paid"]

/** Ported from toRow (index.html:1547-1565). */
export function toRow(inv: Invoice): InvoiceRow {
  const row: InvoiceRow = { id: String(inv.id) }
  for (const [js, db] of SB_FIELDS) {
    let v: unknown = inv[js]
    if (v === "") v = null
    row[db] = v === undefined ? null : v
  }
  for (const k of DATE_FIELDS) {
    const v = row[k]
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(String(v).slice(0, 10))) row[k] = null
    else if (v) row[k] = String(v).slice(0, 10)
  }
  for (const k of NUMERIC_FIELDS) {
    if (row[k] !== null && row[k] !== undefined && isNaN(Number(row[k]))) row[k] = null
  }
  if (row.year !== null && row.year !== undefined) row.year = String(row.year)
  if (row.rig !== null && row.rig !== undefined) row.rig = String(row.rig)
  return row
}

/** Ported from fromRow (index.html:1566-1573). */
export function fromRow(row: InvoiceRow): Invoice {
  const draft: Record<string, unknown> = { id: row.id }
  for (const [js, db] of SB_FIELDS) {
    const v = row[db]
    draft[js] = v === null || v === undefined ? "" : v
  }
  const numericJsFields: Array<keyof Invoice> = [
    "srNo",
    "amountExclTax",
    "gstPst",
    "tax",
    "amountInclTax",
    "amountPaid",
  ]
  for (const k of numericJsFields) {
    const v = draft[k]
    if (v !== "" && v !== null && v !== undefined) draft[k] = Number(v)
  }
  // Server-stamped columns, deliberately outside SB_FIELDS so toRow() never sends
  // client values for them — the DB trigger is the only thing that sets these.
  draft.createdByName = row.created_by_name || ""
  draft.updatedByName = row.updated_by_name || ""
  draft.updatedAt = row.updated_at ? String(row.updated_at) : ""
  return draft as unknown as Invoice
}

export function blankInvoice(): Invoice {
  return {
    id: crypto.randomUUID(),
    srNo: "",
    vendor: "",
    invoiceNo: "",
    contractNo: "",
    wellName: "",
    invoiceDate: "",
    receivingDate: "",
    clearanceDate: "",
    loginDate: "",
    yr: "",
    receivingMonth: "",
    serviceMonth: "",
    qtr: "",
    service: "",
    type: "",
    region: "",
    rig: "",
    location: "",
    year: "",
    description: "",
    amountExclTax: "",
    gstPst: "",
    tax: "",
    amountInclTax: "",
    amountPaid: "",
    status: "",
  }
}
