import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { runInvoiceMigrations } from "@/lib/migrations"
import { fromRow, toRow, type Invoice, type InvoiceRow } from "@/types/invoice"

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

export function useUpsertInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invoice: Invoice) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from("invoices")
        .upsert(toRow(invoice), { onConflict: "id" })
      if (error) throw error
      return invoice
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  })
}

export function useBulkUpsertInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (invoices: Invoice[]) => {
      const supabase = getSupabaseClient()
      const rows = invoices.map(toRow)
      const chunk = 200
      for (let i = 0; i < rows.length; i += chunk) {
        const { error } = await supabase
          .from("invoices")
          .upsert(rows.slice(i, i + chunk), { onConflict: "id" })
        if (error) throw error
      }
      return invoices.length
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("invoices").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  })
}

export function useDeleteInvoices() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const supabase = getSupabaseClient()
      const chunk = 100
      for (let i = 0; i < ids.length; i += chunk) {
        const { error } = await supabase
          .from("invoices")
          .delete()
          .in("id", ids.slice(i, i + chunk))
        if (error) throw error
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY }),
  })
}
