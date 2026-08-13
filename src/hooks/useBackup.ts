import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"
import type { Backup } from "@/lib/backup"
import { useActivityStore } from "@/store/useActivityStore"
import { logActivity } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"
import { CONTRACTS_QUERY_KEY } from "@/hooks/useContracts"
import { INVOICES_QUERY_KEY } from "@/hooks/useInvoices"
import { reconcileContractsTo, reconcileInvoicesTo, reconcileRefListsTo } from "@/hooks/useUndo"
import { REFERENCE_LISTS_QUERY_KEY, type ReferenceLists } from "@/lib/referenceLists"

/** Ported from restoreBackup (index.html:1839-1866), reconciling Supabase
 *  instead of reassigning a local array (see useUndo's reconcileInvoicesTo
 *  for why). Also restores the reference lists; the activity log is no
 *  longer among the restored fields (see comment below). Its undo snapshot
 *  captures all three tables — a restore overwrites all of them, so undoing
 *  it has to revert all three, not just invoices. */
export function useRestoreBackup() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (backup: Backup) => {
      const currentInvoices = (queryClient.getQueryData(INVOICES_QUERY_KEY) as Invoice[] | undefined) ?? []
      const currentContracts = (queryClient.getQueryData(CONTRACTS_QUERY_KEY) as Contract[] | undefined) ?? []
      const currentRefLists = queryClient.getQueryData(REFERENCE_LISTS_QUERY_KEY) as ReferenceLists | undefined

      const undoId = useActivityStore.getState().pushUndo("Restore from backup", {
        invoices: currentInvoices,
        contracts: currentContracts,
        ...(currentRefLists ? { refLists: currentRefLists } : {}),
      })

      await reconcileInvoicesTo(backup.data.invoices, currentInvoices)
      await reconcileContractsTo(backup.data.contracts, currentContracts)
      if (Object.keys(backup.data.refLists).length) {
        await reconcileRefListsTo(backup.data.refLists)
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
