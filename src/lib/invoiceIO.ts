import * as XLSX from "xlsx"
import type { Invoice } from "@/types/invoice"

/** Ported from EXPORT_COLS (index.html:2457-2463). */
const EXPORT_COLS: Array<[keyof Invoice, string]> = [
  ["srNo", "Sr No"], ["vendor", "Vendor"], ["invoiceNo", "Invoice No"], ["contractNo", "Contract No"],
  ["wellName", "Well Name"], ["invoiceDate", "Invoice Date"], ["receivingDate", "Receiving Date"], ["clearanceDate", "Clearance Date"],
  ["service", "Service"], ["type", "Type"], ["region", "Region"], ["rig", "Rig"], ["location", "Location"], ["description", "Description"],
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

/** Real .xlsx (via SheetJS), replacing the legacy app's XML-as-.xls trick. */
export function exportInvoicesXlsx(rows: Invoice[]) {
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
  "well name": "wellName", wellname: "wellName", well: "wellName",
  "invoice date": "invoiceDate", invoicedate: "invoiceDate", date: "invoiceDate", "inv date": "invoiceDate",
  "receiving date": "receivingDate", receivingdate: "receivingDate", received: "receivingDate", "received date": "receivingDate", "rcv date": "receivingDate",
  "clearance date": "clearanceDate", clearancedate: "clearanceDate", cleared: "clearanceDate", "clearing date": "clearanceDate", "clear date": "clearanceDate",
  "log-in date": "loginDate", "login date": "loginDate", "log in date": "loginDate", logindate: "loginDate",
  service: "service", type: "type", region: "region", rig: "rig", location: "location", site: "location",
  yr: "yr", "receiving mnth": "receivingMonth", "receiving month": "receivingMonth", "rec mnth": "receivingMonth", "receiving mth": "receivingMonth",
  "service month": "serviceMonth", servicemonth: "serviceMonth", "svc month": "serviceMonth",
  description: "description", desc: "description", details: "description", narration: "description", particulars: "description",
  "amount excl tax": "amountExclTax", amountexcltax: "amountExclTax", "excl tax": "amountExclTax", "amount excluding tax": "amountExclTax", "net amount": "amountExclTax", amount: "amountExclTax", "amount excluding tax usd": "amountExclTax", "amount excl tax usd": "amountExclTax", "amt excl tax": "amountExclTax", "excluding tax": "amountExclTax",
  "gst/pst": "gstPst", gst: "gstPst", "gst pst": "gstPst", gstpst: "gstPst", "tax rate": "gstPst", "gst/pst rate": "gstPst",
  tax: "tax", "tax amount": "tax", "tax usd": "tax", "tax value": "tax",
  "amount incl tax": "amountInclTax", amountincltax: "amountInclTax", "incl tax": "amountInclTax", "gross amount": "amountInclTax", total: "amountInclTax", "amount including tax": "amountInclTax", "amount including tax usd": "amountInclTax", "amount incl tax usd": "amountInclTax", "amt incl tax": "amountInclTax", "including tax": "amountInclTax",
  "amount paid": "amountPaid", amountpaid: "amountPaid", paid: "amountPaid", "amount paid usd": "amountPaid", "amt paid": "amountPaid",
  status: "status", quarter: "qtr", qtr: "qtr", q: "qtr", "yr-qtr": "yrQtr", year: "year",
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
    const mm = b.padStart(2, "0")
    const dd = a.padStart(2, "0")
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

/** Ported from mapImportedRows (index.html:2596-2629). */
export function mapImportedRows(matrix: ImportMatrix): { records: ImportedRecord[]; unmatched: string[] } {
  if (!matrix.length) return { records: [], unmatched: [] }
  const hIdx = detectHeaderRow(matrix)
  const rawHeaders = matrix[hIdx] || []
  const headers = rawHeaders.map(normHeader)
  const map = headers.map((h) => IMPORT_ALIASES[h] || null)
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
  return { records, unmatched }
}

/** Ported from invoiceDupKey (index.html:2630-2635). */
export function invoiceDupKey(r: { vendor?: unknown; invoiceNo?: unknown; amountExclTax?: unknown }): string {
  const vendor = String(r.vendor || "").trim().toLowerCase()
  const invNo = String(r.invoiceNo || "").trim().toLowerCase()
  const amt = Math.round((Number(r.amountExclTax) || 0) * 100)
  return `${vendor}::${invNo}::${amt}`
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
    srNo: (rec.srNo as number) || nextSrNo(),
    vendor: "", invoiceNo: "", contractNo: "", wellName: "",
    invoiceDate: "", receivingDate: "", clearanceDate: "", loginDate: "", yr: "", receivingMonth: "", serviceMonth: "",
    service: "", type: "", region: "", rig: "", location: "",
    description: "", gstPst: g, year: String(new Date().getFullYear()), qtr: "", status: "Under Process",
    ...rec,
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
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: "array" })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as ImportMatrix
}
