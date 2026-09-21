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
  department: string
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
  /** When the row was first uploaded/entered — the table's own `created_at`, never sent back. */
  createdAt?: string
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
  ["department", "department"],
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
  // `department` is NOT NULL in the DB (see supabase/departments_setup.sql) — unlike
  // every other field here, an explicit null would violate that constraint rather than
  // just falling back to the column's own default, since a provided value (even null)
  // always overrides a DEFAULT in an insert/upsert. This covers any invoice that never
  // went through the department picker — imports from a file with no Department column,
  // in particular, which is every pre-existing spreadsheet.
  if (!row.department) row.department = "Drilling Fluids"
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
  draft.createdAt = row.created_at ? String(row.created_at) : ""
  draft.createdByName = row.created_by_name || ""
  draft.updatedByName = row.updated_by_name || ""
  draft.updatedAt = row.updated_at ? String(row.updated_at) : ""
  return draft as unknown as Invoice
}

/** Calendar year for grouping/filtering — derived from invoiceDate first, since that's
 *  the one field that's always a real, consistently-formatted date. `year` (plain
 *  calendar year, e.g. "2023") is a fallback for the rare invoice missing a date
 *  entirely; `yr` is deliberately NOT used as a calendar-year fallback even though it's
 *  sometimes populated — it's a different field, OGDCL's fiscal year in "YYYY-YY" /
 *  "YYYY-YYYY" form (July–June, see the dashboard's "Fiscal year 2026-2027" KPI tile and
 *  dashboard.ts's fyKey()), not an alternate spelling of calendar year. Grouping by
 *  invoiceDate-first fixes two bugs that showed up together in production: (1) any
 *  invoice with `year`/`yr` left blank — seemingly everything entered since the legacy
 *  bulk-imported data ends around 2022, since neither field is required on the
 *  invoice-entry form and `yr` isn't even editable there (see InvoiceDrawer.tsx) —
 *  silently dropped out of "by year"/"by quarter" views instead of appearing under its
 *  real period; and (2) invoices that DO have `yr` set (e.g. "2022-23") showed up as a
 *  separate bucket from same-year invoices using the plain `year` field (e.g. "2022"),
 *  splitting one calendar year's invoices across two mismatched labels. */
export function invoiceYear(inv: Invoice): string {
  if (inv.invoiceDate && /^\d{4}/.test(inv.invoiceDate)) return inv.invoiceDate.slice(0, 4)
  if (inv.year) return String(inv.year)
  if (inv.yr) return String(inv.yr)
  return ""
}

/** Same invoiceDate-first approach as invoiceYear(), and for the same reason: `qtr` is a
 *  free-picked "Q1"–"Q4" value with no guarantee it means the same (calendar vs. fiscal)
 *  quarter as `yr` does when both are set on an older row. */
export function invoiceQuarter(inv: Invoice): string {
  if (inv.invoiceDate && /^\d{4}-\d{2}/.test(inv.invoiceDate)) {
    const month = Number(inv.invoiceDate.slice(5, 7))
    if (month >= 1 && month <= 12) return `Q${Math.ceil(month / 3)}`
  }
  if (inv.qtr) return inv.qtr
  return ""
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
    department: "",
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
