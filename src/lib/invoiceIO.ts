import { storeGet, storeSet } from "@/lib/localCache"
import type { Invoice } from "@/types/invoice"

/** Ported from EXPORT_COLS (index.html:2457-2463). */
const EXPORT_COLS: Array<[keyof Invoice, string]> = [
  ["srNo", "Sr No"], ["vendor", "Vendor"], ["invoiceNo", "Invoice No"], ["contractNo", "Contract No"],
  ["wellName", "Well Name"], ["invoiceDate", "Invoice Date"], ["receivingDate", "Receiving Date"], ["clearanceDate", "Clearance Date"],
  ["service", "Service"], ["type", "Type"], ["department", "Department"], ["region", "Region"], ["rig", "Rig"], ["location", "Location"], ["description", "Description"],
  ["amountExclTax", "Amount Excl Tax"], ["gstPst", "GST/PST"], ["tax", "Tax"], ["amountInclTax", "Amount Incl Tax"], ["amountPaid", "Amount Paid"],
  ["status", "Status"], ["qtr", "Quarter"], ["year", "Year"],
]

function esc(v: unknown): string {
  return v === undefined || v === null ? "" : String(v)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Ported from exportData's 'csv' branch (index.html:2475-2483). */
export function exportInvoicesCsv(rows: Invoice[]) {
  const stamp = new Date().toISOString().slice(0, 10)
  const sep = ","
  const header = EXPORT_COLS.map((c) => c[1]).join(sep)
  const lines = rows.map((r) =>
    EXPORT_COLS.map((c) => {
      let v = esc(r[c[0]]).replace(/"/g, '""')
      if (v.includes(sep) || v.includes('"') || v.includes("\n")) v = '"' + v + '"'
      return v
    }).join(sep)
  )
  triggerDownload(
    new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" }),
    `OGDCL_invoices_${stamp}.csv`
  )
}

/** Real .xlsx (via SheetJS), replacing the legacy app's XML-as-.xls trick.
 *  SheetJS is a large dependency (~500kB) only needed when someone actually
 *  exports/imports Excel — dynamically imported so it doesn't ship in the
 *  Invoices route's initial chunk for everyone who never touches it. */
export async function exportInvoicesXlsx(rows: Invoice[]) {
  const XLSX = await import("xlsx")
  const stamp = new Date().toISOString().slice(0, 10)
  const aoa = [EXPORT_COLS.map((c) => c[1]), ...rows.map((r) => EXPORT_COLS.map((c) => r[c[0]] ?? ""))]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Invoices")
  XLSX.writeFile(wb, `OGDCL_invoices_${stamp}.xlsx`)
}

/** Ported from IMPORT_ALIASES (index.html:2521-2541). */
const IMPORT_ALIASES: Record<string, string> = {
  srno: "srNo", "sr no": "srNo", "sr#": "srNo", sr: "srNo", serial: "srNo", "serial no": "srNo", "s no": "srNo", sno: "srNo",
  vendor: "vendor", contractor: "vendor", supplier: "vendor", "vendor name": "vendor",
  "invoice no": "invoiceNo", invoiceno: "invoiceNo", invoice: "invoiceNo", "inv no": "invoiceNo", "bill no": "invoiceNo", "invoice number": "invoiceNo", "invoice #": "invoiceNo",
  "contract no": "contractNo", contractno: "contractNo", contract: "contractNo", "contract number": "contractNo",
  "well name": "wellName", wellname: "wellName", well: "wellName", "name of well": "wellName",
  "invoice date": "invoiceDate", invoicedate: "invoiceDate", date: "invoiceDate", "inv date": "invoiceDate",
  "receiving date": "receivingDate", receivingdate: "receivingDate", received: "receivingDate", "received date": "receivingDate", "rcv date": "receivingDate",
  "clearance date": "clearanceDate", clearancedate: "clearanceDate", cleared: "clearanceDate", "clearing date": "clearanceDate", "clear date": "clearanceDate",
  "log-in date": "loginDate", "login date": "loginDate", "log in date": "loginDate", logindate: "loginDate",
  service: "service", type: "type", department: "department", dept: "department", "department name": "department",
  region: "region", rig: "rig", location: "location", site: "location",
  yr: "yr", "receiving mnth": "receivingMonth", "receiving month": "receivingMonth", "rec mnth": "receivingMonth", "receiving mth": "receivingMonth",
  "service month": "serviceMonth", servicemonth: "serviceMonth", "svc month": "serviceMonth",
  description: "description", desc: "description", details: "description", narration: "description", particulars: "description",
  "amount excl tax": "amountExclTax", amountexcltax: "amountExclTax", "excl tax": "amountExclTax", "amount excluding tax": "amountExclTax", "net amount": "amountExclTax", amount: "amountExclTax", "amount excluding tax usd": "amountExclTax", "amount excl tax usd": "amountExclTax", "amt excl tax": "amountExclTax", "excluding tax": "amountExclTax",
  "gst/pst": "gstPst", gst: "gstPst", "gst pst": "gstPst", gstpst: "gstPst", "tax rate": "gstPst", "gst/pst rate": "gstPst",
  tax: "tax", "tax amount": "tax", "tax usd": "tax", "tax value": "tax",
  "amount incl tax": "amountInclTax", amountincltax: "amountInclTax", "incl tax": "amountInclTax", "gross amount": "amountInclTax", total: "amountInclTax", "amount including tax": "amountInclTax", "amount including tax usd": "amountInclTax", "amount incl tax usd": "amountInclTax", "amt incl tax": "amountInclTax", "including tax": "amountInclTax",
  "amount paid": "amountPaid", amountpaid: "amountPaid", paid: "amountPaid", "amount paid usd": "amountPaid", "amt paid": "amountPaid",
  "amount verified": "amountPaid", "verified amount": "amountPaid", "amount cleared": "amountPaid",
  status: "status", quarter: "qtr", qtr: "qtr", q: "qtr", "yr-qtr": "yrQtr", year: "year",
}

/** Friendly display name for every field an imported column can map to — EXPORT_COLS'
 *  labels plus the handful of importable-only fields (loginDate/receivingMonth/
 *  serviceMonth/yr) that never round-trip through export. Drives the column-mapping
 *  preview in ImportDialog. */
const FIELD_LABELS: Record<string, string> = {
  ...Object.fromEntries(EXPORT_COLS.map(([key, label]) => [key, label])),
  loginDate: "Log-in Date",
  receivingMonth: "Receiving Month",
  serviceMonth: "Service Month",
  yr: "Year (short)",
}

export function importFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field
}

export type ImportMatrix = unknown[][]

/** Ported from normHeader (index.html:2543-2551). */
function normHeader(h: unknown): string {
  return String(h == null ? "" : h)
    .replace(/[\r\n]+/g, " ")
    .replace(/\(usd\)/gi, " ")
    .replace(/[.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

/** Ported from parseDelimited (index.html:2552-2569) — used for CSV text. */
export function parseDelimited(text: string, sep: string): ImportMatrix {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else inQ = false
      } else cell += ch
    } else {
      if (ch === '"') inQ = true
      else if (ch === sep) {
        row.push(cell)
        cell = ""
      } else if (ch === "\n") {
        row.push(cell)
        rows.push(row)
        row = []
        cell = ""
      } else if (ch === "\r") {
        // skip
      } else cell += ch
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""))
}

/** Ported from normalizeDate (index.html:2570-2581). */
function normalizeDate(v: unknown): string {
  if (!v) return ""
  let s = String(v).trim()
  if (s === "0" || s === "00:00:00") return ""
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/)
  if (m) {
    let [, a, b, y] = m
    if (y.length === 2) y = "20" + y
    let day = Number(a)
    let month = Number(b)
    // Default assumption is DD/MM/YYYY, but a source cell in US MM/DD/YYYY format
    // (e.g. "4/25/2022" for April 25) would otherwise read as day=4, month=25 —
    // an invalid month Postgres rejects with "date/time field value out of range"
    // instead of a clear "bad row" error at import time. Swap when the naive
    // reading is impossible but the flipped one isn't.
    if (month > 12 && day <= 12) {
      ;[day, month] = [month, day]
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return ""
    const mm = String(month).padStart(2, "0")
    const dd = String(day).padStart(2, "0")
    return `${y}-${mm}-${dd}`
  }
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(s)) * 86400000)
    return d.toISOString().slice(0, 10)
  }
  return s
}

/** Ported from detectHeaderRow (index.html:2584-2595). */
function detectHeaderRow(matrix: ImportMatrix): number {
  const wanted = ["vendor", "invoice", "contract", "amount", "status", "service"]
  let bestIdx = 0
  let bestScore = -1
  const scan = Math.min(matrix.length, 15)
  for (let i = 0; i < scan; i++) {
    const cells = (matrix[i] || []).map(normHeader)
    let score = 0
    cells.forEach((c) => {
      if (IMPORT_ALIASES[c]) score++
      wanted.forEach((w) => {
        if (c.includes(w)) score += 0.5
      })
    })
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return bestScore >= 2 ? bestIdx : 0
}

export interface ImportedRecord {
  [key: string]: string | number
}

/** One column of the source file, and what it mapped to (null when unrecognized) —
 *  the full picture ImportDialog's column-mapping preview needs, in file column order,
 *  including blank/unmatched columns the old `unmatched`-only return silently allowed
 *  through unlisted. `values` are every non-blank cell under that header, in row order,
 *  so the preview can show a column's actual content next to its title before import. */
export interface ImportHeaderMapping {
  raw: string
  field: string | null
  values: string[]
}

/** Ported from mapImportedRows (index.html:2596-2629). */
export function mapImportedRows(matrix: ImportMatrix): { records: ImportedRecord[]; unmatched: string[]; headerMap: ImportHeaderMapping[] } {
  if (!matrix.length) return { records: [], unmatched: [], headerMap: [] }
  const hIdx = detectHeaderRow(matrix)
  const rawHeaders = matrix[hIdx] || []
  const headers = rawHeaders.map(normHeader)
  const map = headers.map((h) => IMPORT_ALIASES[h] || null)
  const dataRows = matrix.slice(hIdx + 1)
  const headerMap: ImportHeaderMapping[] = rawHeaders
    .map((raw, i) => ({
      raw: String(raw).replace(/[\r\n]+/g, " ").trim(),
      field: map[i] === "yrQtr" ? null : map[i],
      values: dataRows
        .map((row) => row?.[i])
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== "")
        .map((v) => String(v).trim()),
    }))
    .filter((o) => o.raw)
  const unmatched = headers
    .map((h, i) => ({ h, raw: rawHeaders[i] }))
    .filter((o, i) => !map[i] && o.h)
    .map((o) => String(o.raw).replace(/[\r\n]+/g, " ").trim())
  const dateFields = new Set(["invoiceDate", "receivingDate", "clearanceDate", "loginDate"])
  const numFields = new Set(["srNo", "amountExclTax", "gstPst", "tax", "amountInclTax", "amountPaid", "year"])
  const records: ImportedRecord[] = []
  for (let i = hIdx + 1; i < matrix.length; i++) {
    const line = matrix[i]
    if (!line) continue
    const rec: ImportedRecord = {}
    let hasData = false
    map.forEach((key, ci) => {
      if (!key || key === "yrQtr") return
      let val: unknown = line[ci]
      if (val === undefined || val === null) return
      let strVal = String(val).trim()
      if (strVal === "") return
      if (dateFields.has(key)) {
        rec[key] = normalizeDate(strVal)
        hasData = true
        return
      }
      if (numFields.has(key)) {
        const num = Number(strVal.replace(/[,$%\s]/g, ""))
        if (isNaN(num)) return
        rec[key] = num
        hasData = true
        return
      }
      rec[key] = strVal
      hasData = true
    })
    if (hasData && (rec.vendor || rec.invoiceNo || rec.amountExclTax || rec.amountInclTax)) records.push(rec)
  }
  return { records, unmatched, headerMap }
}

/** Ported from invoiceDupKey (index.html:2630-2635). */
export function invoiceDupKey(r: { vendor?: unknown; invoiceNo?: unknown; amountExclTax?: unknown }): string {
  const vendor = String(r.vendor || "").trim().toLowerCase()
  const invNo = String(r.invoiceNo || "").trim().toLowerCase()
  const amt = Math.round((Number(r.amountExclTax) || 0) * 100)
  return `${vendor}::${invNo}::${amt}`
}

export interface DuplicateGroup {
  rows: Invoice[]
  /** true when every row in the group also shares the same amount, not just vendor + invoice no. */
  exact: boolean
}

/** Groups of invoices that share the same vendor + invoice no. (case/whitespace-insensitive).
 *  Groups flagged `exact` also share the same amount; the rest share the invoice no./vendor but
 *  differ in amount — still worth a human look (typo, re-entry, or a genuine second charge).
 *  Ported from findDuplicateGroups (index.html:2637-2658). */
export function findDuplicateGroups(invoices: Invoice[]): DuplicateGroup[] {
  const groups = new Map<string, Invoice[]>()
  for (const r of invoices) {
    const vendor = String(r.vendor || "").trim().toLowerCase()
    const invNo = String(r.invoiceNo || "").trim().toLowerCase()
    if (!vendor || !invNo) continue
    const key = `${vendor}::${invNo}`
    const list = groups.get(key)
    if (list) list.push(r)
    else groups.set(key, [r])
  }
  return Array.from(groups.values())
    .filter((g) => g.length > 1)
    .map((g) => {
      const rows = g.slice().sort((a, b) => (Number(a.srNo) || 0) - (Number(b.srNo) || 0))
      const amounts = new Set(rows.map((r) => Math.round((Number(r.amountExclTax) || 0) * 100)))
      return { rows, exact: amounts.size === 1 }
    })
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.rows.length - a.rows.length)
}

const IGNORED_DUPLICATES_KEY = "ignoredDuplicateInvoiceIds"

/** Invoice ids a user has marked "not actually a duplicate" from the Duplicate Finder —
 *  persisted locally (per browser) via the same storeGet/storeSet layer as every other
 *  saved preference, so they stay excluded from the finder's groups across reloads. */
export function loadIgnoredDuplicateIds(): Set<string> {
  return new Set(storeGet<string[]>(IGNORED_DUPLICATES_KEY) ?? [])
}

export function saveIgnoredDuplicateIds(ids: Set<string>): void {
  storeSet(IGNORED_DUPLICATES_KEY, Array.from(ids))
}

/** Fields eligible to be backfilled onto an existing invoice during an
 *  update-import. Deliberately excludes vendor/invoiceNo (part of the dup
 *  key, so they already match), amountExclTax (also part of the key) and
 *  gstPst — the paid/tax/incl-tax amounts are handled separately below. */
const MERGEABLE_FIELDS: Array<keyof Invoice> = [
  "contractNo", "wellName", "invoiceDate", "receivingDate", "clearanceDate", "loginDate",
  "yr", "receivingMonth", "serviceMonth", "qtr", "service", "type", "department",
  "region", "rig", "location", "year", "description", "status",
]

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || String(v).trim() === ""
}

/** Amounts a file can add to an existing invoice — filled only while the stored
 *  value is still 0/blank (a fresh invoice defaults these to 0), never overwritten. */
const MERGEABLE_AMOUNTS: Array<keyof Invoice> = ["amountPaid", "tax", "amountInclTax"]

/** Fills only currently-blank fields on an existing invoice from a matched
 *  imported row, so re-importing a refreshed spreadsheet backfills missing
 *  details (well name, dates, department, paid amount, …) without ever
 *  overwriting a value that's already there and without creating a duplicate row. */
export function mergeMissingFields(
  existing: Invoice,
  rec: ImportedRecord
): { invoice: Invoice; filledFields: Array<keyof Invoice> } {
  const filledFields: Array<keyof Invoice> = []
  const invoice: Invoice = { ...existing }
  for (const key of MERGEABLE_FIELDS) {
    if (!isBlank(existing[key])) continue
    const incoming = rec[key as string]
    if (isBlank(incoming)) continue
    ;(invoice as unknown as Record<string, unknown>)[key] = incoming
    filledFields.push(key)
  }
  for (const key of MERGEABLE_AMOUNTS) {
    if (Number(existing[key]) > 0) continue
    const incoming = Number(rec[key as string])
    if (!(incoming > 0)) continue
    ;(invoice as unknown as Record<string, unknown>)[key] = incoming
    filledFields.push(key)
  }
  return { invoice, filledFields }
}

/** Collapses rows of one import file that describe the same invoice (same vendor,
 *  invoice no. and amount) into one record — later rows only fill what earlier ones
 *  left blank — so a file listing an invoice twice can't create it twice. Rows with
 *  neither vendor nor invoice no. have nothing to identify them by and are left alone. */
export function collapseImportedDuplicates(records: ImportedRecord[]): { records: ImportedRecord[]; collapsed: number } {
  const byKey = new Map<string, ImportedRecord>()
  const out: ImportedRecord[] = []
  let collapsed = 0
  for (const r of records) {
    if (isBlank(r.vendor) && isBlank(r.invoiceNo)) {
      out.push(r)
      continue
    }
    const key = invoiceDupKey(r)
    const prev = byKey.get(key)
    if (!prev) {
      const copy = { ...r }
      byKey.set(key, copy)
      out.push(copy)
      continue
    }
    collapsed++
    for (const [k, v] of Object.entries(r)) if (isBlank(prev[k]) && !isBlank(v)) prev[k] = v
  }
  return { records: out, collapsed }
}

export function vendorInvoiceKey(r: { vendor?: unknown; invoiceNo?: unknown }): string {
  return `${String(r.vendor || "").trim().toLowerCase()}::${String(r.invoiceNo || "").trim().toLowerCase()}`
}

/** The existing invoice an imported row refers to: the exact vendor + invoice no. +
 *  amount match, or — when the row carries no amount to compare — the same vendor +
 *  invoice no., so an amount-less row updates that invoice instead of adding a 0.00 twin. */
export function findExistingForImport(
  rec: ImportedRecord,
  byKey: Map<string, Invoice>,
  byVendorInvoice: Map<string, Invoice>
): Invoice | undefined {
  const exact = byKey.get(invoiceDupKey(rec))
  if (exact) return exact
  if (Number(rec.amountExclTax) > 0 || isBlank(rec.invoiceNo)) return undefined
  return byVendorInvoice.get(vendorInvoiceKey(rec))
}

/** Ported from finalizeImported (index.html:2659-2677). */
export function finalizeImportedRecord(rec: ImportedRecord, nextSrNo: () => number): Invoice {
  const a = Number(rec.amountExclTax) || 0
  let g = rec.gstPst !== undefined && rec.gstPst !== "" ? Number(rec.gstPst) : 0.15
  if (g > 1) g = g / 100
  const tax = rec.tax !== undefined && rec.tax !== "" ? Number(rec.tax) : a * g
  const incl = rec.amountInclTax !== undefined && rec.amountInclTax !== "" ? Number(rec.amountInclTax) : a + tax
  if (!rec.wellName) {
    if (rec.location) rec.wellName = rec.location
    else if (rec.description && !/\bto\b/i.test(String(rec.description)) && !/\[src/i.test(String(rec.description)))
      rec.wellName = rec.description
  }
  return {
    id: crypto.randomUUID(),
    vendor: "", invoiceNo: "", contractNo: "", wellName: "",
    invoiceDate: "", receivingDate: "", clearanceDate: "", loginDate: "", yr: "", receivingMonth: "", serviceMonth: "",
    service: "", type: "", department: "", region: "", rig: "", location: "",
    description: "", gstPst: g, year: String(new Date().getFullYear()), qtr: "", status: "Under Process",
    ...rec,
    // Always the app's own next Sr. No. — the spreadsheet's SNO is that file's row
    // counter, and keeping it made imported rows collide with existing invoices' numbers
    // (1,367 invoices but a highest Sr. No. of 1,338).
    srNo: nextSrNo(),
    amountExclTax: a,
    tax,
    amountInclTax: incl,
    amountPaid: Number(rec.amountPaid) || 0,
  } as Invoice
}

/** Reads a .csv/.xlsx/.xls file into a raw cell matrix. */
export async function parseImportFile(file: File): Promise<ImportMatrix> {
  const name = file.name.toLowerCase()
  if (name.endsWith(".csv")) {
    const text = await file.text()
    return parseDelimited(text, ",")
  }
  const XLSX = await import("xlsx")
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as ImportMatrix
}

/** Invoices whose Sr. No. is missing or shared with an earlier invoice, returned with a
 *  fresh Sr. No. after the current highest. Within each shared number the oldest invoice
 *  (by createdAt, else list order) keeps it — only the later duplicates change. */
export function planSrNoRenumber(invoices: Invoice[]): Invoice[] {
  const byCreated = (a: Invoice, b: Invoice) => String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
  const groups = new Map<number, Invoice[]>()
  const unnumbered: Invoice[] = []
  for (const inv of invoices) {
    const n = Number(inv.srNo)
    if (!n) {
      unnumbered.push(inv)
      continue
    }
    const list = groups.get(n) ?? []
    list.push(inv)
    groups.set(n, list)
  }
  const needsNew: Invoice[] = [...unnumbered]
  for (const list of groups.values()) {
    if (list.length > 1) needsNew.push(...list.slice().sort(byCreated).slice(1))
  }
  needsNew.sort(byCreated)
  let next = invoices.reduce((m, r) => Math.max(m, Number(r.srNo) || 0), 0)
  return needsNew.map((inv) => ({ ...inv, srNo: ++next }))
}
