import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { DEFAULT_REF, REFERENCE_LISTS_QUERY_KEY, type ReferenceLists } from "@/lib/referenceLists"
import { INVOICES_QUERY_KEY } from "@/hooks/useInvoices"
import { CONTRACTS_QUERY_KEY } from "@/hooks/useContracts"

/**
 * Renames a department in place: updates the picklist entry AND every invoice/contract
 * already tagged with the old name. Unlike add/delete (deliberately non-destructive —
 * see referenceLists.ts), a rename is meant to relabel existing records rather than
 * strand them under a name that's no longer in the picklist.
 */
export function useRenameDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ from, to }: { from: string; to: string }) => {
      const supabase = getSupabaseClient()
      const current = (queryClient.getQueryData(REFERENCE_LISTS_QUERY_KEY) as ReferenceLists | undefined) ?? DEFAULT_REF
      const values = current.departments.map((d) => (d === from ? to : d))

      const [listRes, invoicesRes, contractsRes] = await Promise.all([
        supabase.from("reference_lists").upsert({ key: "departments", values }, { onConflict: "key" }),
        supabase.from("invoices").update({ department: to }).eq("department", from),
        supabase.from("contracts").update({ department: to }).eq("department", from),
      ])
      if (listRes.error) throw listRes.error
      if (invoicesRes.error) throw invoicesRes.error
      if (contractsRes.error) throw contractsRes.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERENCE_LISTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY })
    },
  })
}
