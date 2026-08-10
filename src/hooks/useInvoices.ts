import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { runInvoiceMigrations } from "@/lib/migrations"
import { fromRow, toRow, type Invoice, type InvoiceRow } from "@/types/invoice"
import { useActivityStore } from "@/store/useActivityStore"
import { useAuth } from "@/hooks/useAuth"
import { fmtMoney } from "@/lib/dashboard"

const PAGE_SIZE = 1000

async function fetchAllInvoices(): Promise<Invoice[]> {
  const supabase = getSupabaseClient()
  const all: InvoiceRow[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("sr_no", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = (data ?? []) as InvoiceRow[]
    all.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return runInvoiceMigrations(all.map(fromRow))
}

export const INVOICES_QUERY_KEY = ["invoices"] as const

export function useInvoicesQuery() {
  return useQuery({ queryKey: INVOICES_QUERY_KEY, queryFn: fetchAllInvoices })
}

/** Ported from the Add/Edit invoice-drawer submit handler (index.html:6206-6215). */
export function useUpsertInvoice() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(INVOICES_QUERY_KEY) as Invoice[] | undefined) ?? []
      const wasEdit = current.some((r) => r.id === invoice.id)
      const undoId = useActivityStore
        .getState()
        .pushUndo(wasEdit ? `Edit of invoice ${invoice.invoiceNo || invoice.srNo}` : `Add of invoice ${invoice.invoiceNo || invoice.srNo}`, current)

      const { error } = await supabase.from("invoices").upsert(toRow(invoice), { onConflict: "id" })
      if (error) throw error

      useActivityStore.getState().logActivity(
        { name: user?.name || "Unknown", role: user?.role || "" },
        wasEdit ? "Edit" : "Add",
        `${wasEdit ? "Edited" : "Added"} invoice ${invoice.invoiceNo || `#${invoice.srNo}`}${invoice.vendor ? ` (${invoice.vendor})` : ""}`,
        { invoiceNo: invoice.invoiceNo, vendor: invoice.vendor, undoId }
      )
      return invoice
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  })
}

/** Ported from confirmImport (index.html:6107-6145). */
export function useBulkUpsertInvoices() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (invoices: Invoice[]) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(INVOICES_QUERY_KEY) as Invoice[] | undefined) ?? []
      const undoId = useActivityStore
        .getState()
        .pushUndo(`Import of ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`, current)

      const rows = invoices.map(toRow)
      const chunk = 200
      for (let i = 0; i < rows.length; i += chunk) {
        const { error } = await supabase
          .from("invoices")
          .upsert(rows.slice(i, i + chunk), { onConflict: "id" })
        if (error) throw error
      }

      useActivityStore.getState().logActivity(
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Import",
        `Imported ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`,
        { count: invoices.length, undoId }
      )
      return invoices.length
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  })
}

/** Ported from the delete-confirm handler (index.html:6374-6379). */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(INVOICES_QUERY_KEY) as Invoice[] | undefined) ?? []
      const undoId = useActivityStore
        .getState()
        .pushUndo(`Delete of invoice ${invoice.invoiceNo || `#${invoice.srNo}`}`, current)

      const { error } = await supabase.from("invoices").delete().eq("id", invoice.id)
      if (error) throw error

      useActivityStore.getState().logActivity(
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Delete",
        `Deleted invoice ${invoice.invoiceNo || `#${invoice.srNo}`}${invoice.vendor ? ` (${invoice.vendor})` : ""}`,
        { invoiceNo: invoice.invoiceNo, vendor: invoice.vendor, undoId }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  })
}

/** Ported from the bulk-delete-confirm handler (index.html:6393-6400). */
export function useDeleteInvoices() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (victims: Invoice[]) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(INVOICES_QUERY_KEY) as Invoice[] | undefined) ?? []
      const undoId = useActivityStore
        .getState()
        .pushUndo(`Bulk delete of ${victims.length} invoice${victims.length !== 1 ? "s" : ""}`, current)

      const ids = victims.map((v) => v.id)
      const chunk = 100
      for (let i = 0; i < ids.length; i += chunk) {
        const { error } = await supabase
          .from("invoices")
          .delete()
          .in("id", ids.slice(i, i + chunk))
        if (error) throw error
      }

      const total = victims.reduce((s, r) => s + (Number(r.amountInclTax) || 0), 0)
      useActivityStore.getState().logActivity(
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Delete",
        `Bulk deleted ${victims.length} invoice${victims.length !== 1 ? "s" : ""} (${fmtMoney(total)})`,
        { count: victims.length, undoId }
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  })
}
