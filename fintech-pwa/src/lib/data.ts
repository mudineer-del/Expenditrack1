import { supabase } from "./supabase"
import type { Contract, Invoice } from "../types"

export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n) || 0
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export type StatusTone = "cleared" | "under" | "returned" | "other"

export function statusTone(s: string | null | undefined): StatusTone {
  if (!s) return "other"
  const v = s.toLowerCase()
  if (v.includes("cleared") || v.includes("received")) return v.includes("deduction") ? "under" : "cleared"
  if (v.includes("under") || v.includes("sent") || v.includes("budgeting")) return "under"
  if (v.includes("returned") || v.includes("not created")) return "returned"
  return "other"
}

const INVOICE_COLUMNS =
  "id, invoice_no, vendor, contract_no, well_name, invoice_date, amount_incl_tax, amount_paid, status, service, department"

function fromInvoiceRow(row: Record<string, unknown>): Invoice {
  return {
    id: String(row.id),
    invoiceNo: (row.invoice_no as string) || "",
    vendor: (row.vendor as string) || "",
    contractNo: (row.contract_no as string) || "",
    wellName: (row.well_name as string) || "",
    invoiceDate: (row.invoice_date as string) || "",
    amount: Number(row.amount_incl_tax) || 0,
    paid: Number(row.amount_paid) || 0,
    status: (row.status as string) || "",
    service: (row.service as string) || "",
    department: (row.department as string) || "",
  }
}

function fromContractRow(row: Record<string, unknown>): Contract {
  return {
    id: String(row.id),
    contractNo: (row.contract_no as string) || "",
    vendor: (row.vendor as string) || "",
    title: (row.title as string) || "",
    value: Number(row.value) || 0,
    startDate: (row.start_date as string) || "",
    endDate: (row.end_date as string) || "",
    status: (row.status as string) || "",
    department: (row.department as string) || "",
  }
}

const PAGE_SIZE = 1000

export async function fetchInvoices(): Promise<Invoice[]> {
  if (!supabase) return []
  const all: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("invoices")
      .select(INVOICE_COLUMNS)
      .order("invoice_date", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = data ?? []
    all.push(...(batch as Record<string, unknown>[]))
    if (batch.length < PAGE_SIZE) break
  }
  return all.map(fromInvoiceRow)
}

export async function fetchContracts(): Promise<Contract[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from("contracts").select("*")
  if (error) throw error
  return ((data ?? []) as Record<string, unknown>[]).map(fromContractRow)
}

export interface CategoryTotal {
  label: string
  total: number
  count: number
}

export function groupBy(invoices: Invoice[], key: "service" | "vendor" | "status" | "department"): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>()
  for (const inv of invoices) {
    const label = inv[key] || "Unspecified"
    const entry = map.get(label) ?? { label, total: 0, count: 0 }
    entry.total += inv.amount
    entry.count += 1
    map.set(label, entry)
  }
  return [...map.values()].sort((a, b) => b.total - a.total)
}

export interface MonthTotal {
  month: string
  total: number
}

export function monthlyTrend(invoices: Invoice[]): MonthTotal[] {
  const map = new Map<string, number>()
  for (const inv of invoices) {
    if (!inv.invoiceDate) continue
    const month = inv.invoiceDate.slice(0, 7)
    map.set(month, (map.get(month) ?? 0) + inv.amount)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({ month, total }))
}
