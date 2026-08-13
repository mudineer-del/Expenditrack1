import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getSupabaseClient } from "@/lib/supabase"
import { toContractRow, type Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"
import type { Backup } from "@/lib/backup"
import { useActivityStore } from "@/store/useActivityStore"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"
import { CONTRACTS_QUERY_KEY } from "@/hooks/useContracts"
import { INVOICES_QUERY_KEY } from "@/hooks/useInvoices"
import { reconcileInvoicesTo } from "@/hooks/useUndo"
import { REFERENCE_LISTS_QUERY_KEY } from "@/lib/referenceLists"

async function reconcileContractsTo(snapshot: Contract[], current: Contract[]) {
  const supabase = getSupabaseClient()
  const snapshotIds = new Set(snapshot.map((c) => c.id))
  const toDelete = current.filter((c) => !snapshotIds.has(c.id)).map((c) => c.id)
  const rows = snapshot.map(toContractRow)
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from("contracts").upsert(rows.slice(i, i + 200), { onConflict: "id" })
    if (error) throw error
  }
  for (let i = 0; i < toDelete.length; i += 100) {
    const { error } = await supabase.from("contracts").delete().in("id", toDelete.slice(i, i + 100))
    if (error) throw error
  }
}

/** Ported from restoreBackup (index.html:1839-1866), reconciling Supabase
 *  instead of reassigning a local array (see useUndo's reconcileInvoicesTo
 *  for why). Also restores the reference lists; the activity log is no
 *  longer among the restored fields (see comment below). */
export function useRestoreBackup() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (backup: Backup) => {
      const supabase = getSupabaseClient()
      const currentInvoices = (queryClient.getQueryData(INVOICES_QUERY_KEY) as Invoice[] | undefined) ?? []
      const currentContracts = (queryClient.getQueryData(CONTRACTS_QUERY_KEY) as Contract[] | undefined) ?? []

      const undoId = useActivityStore.getState().pushUndo("Restore from backup", currentInvoices)

      await reconcileInvoicesTo(backup.data.invoices, currentInvoices)
      await reconcileContractsTo(backup.data.contracts, currentContracts)

      const refRows = Object.entries(backup.data.refLists).map(([key, values]) => ({ key, values }))
      if (refRows.length) {
        const { error } = await supabase.from("reference_lists").upsert(refRows, { onConflict: "key" })
        if (error) throw error
      }

      // The backup's activityLog field is kept for historical reference inside
      // the file itself, but no longer replaces the live log — that's now
      // shared team history in Supabase, not something one person's restore
      // should overwrite.
      await logActivity(
        queryClient,
        { name: user?.name || "Unknown", role: user?.role || "" },
        "Restore",
        `Restored backup from ${backup.exportedAt ? backup.exportedAt.slice(0, 10) : "file"} (${backup.data.invoices.length} invoices)`,
        { undoId }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: REFERENCE_LISTS_QUERY_KEY })
    },
  })
}
