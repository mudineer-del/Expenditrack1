import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getSupabaseClient } from "@/lib/supabase"
import { toRow, type Invoice } from "@/types/invoice"
import { toContractRow, type Contract } from "@/types/contract"
import { useActivityStore, type Snapshot, type UndoEntry } from "@/store/useActivityStore"
import { logActivity, useActivityLogQuery } from "@/hooks/useActivityLog"
import { useAuth } from "@/hooks/useAuth"
import { INVOICES_QUERY_KEY } from "@/hooks/useInvoices"
import { CONTRACTS_QUERY_KEY } from "@/hooks/useContracts"
import { REFERENCE_LISTS_QUERY_KEY, type ReferenceLists } from "@/lib/referenceLists"

/**
 * Reconciles Supabase's `invoices` table to match a snapshot: rows no longer
 * in the snapshot are deleted, everything else is upserted with the
 * snapshot's values. This is the Supabase-backed equivalent of the legacy
 * app's doUndoTo (index.html:1995-2003), which just reassigned the local
 * `state.invoices` array — here the source of truth is the database, so
 * "reverting" means writing the old data back to it.
 */
export async function reconcileInvoicesTo(snapshot: Invoice[], current: Invoice[]) {
  const supabase = getSupabaseClient()
  const snapshotIds = new Set(snapshot.map((r) => r.id))
  const toDelete = current.filter((r) => !snapshotIds.has(r.id)).map((r) => r.id)

  const rows = snapshot.map(toRow)
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await supabase.from("invoices").upsert(rows.slice(i, i + 200), { onConflict: "id" })
    if (error) throw error
  }
  for (let i = 0; i < toDelete.length; i += 100) {
    const { error } = await supabase.from("invoices").delete().in("id", toDelete.slice(i, i + 100))
    if (error) throw error
  }
}

/** Same idea as reconcileInvoicesTo, for the `contracts` table. */
export async function reconcileContractsTo(snapshot: Contract[], current: Contract[]) {
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

/** `reference_lists` rows are one per list key, never deleted — reverting just overwrites values. */
export async function reconcileRefListsTo(snapshot: ReferenceLists) {
  const supabase = getSupabaseClient()
  const rows = Object.entries(snapshot).map(([key, values]) => ({ key, values }))
  const { error } = await supabase.from("reference_lists").upsert(rows, { onConflict: "key" })
  if (error) throw error
}

/** Reconciles whichever parts of a Snapshot are present, then invalidates the matching queries. */
async function reconcileSnapshot(
  snapshot: Snapshot,
  queryClient: ReturnType<typeof useQueryClient>,
  currentInvoices: Invoice[],
  currentContracts: Contract[]
) {
  if (snapshot.invoices) {
    await reconcileInvoicesTo(snapshot.invoices, currentInvoices)
    await queryClient.invalidateQueries({ queryKey: INVOICES_QUERY_KEY })
  }
  if (snapshot.contracts) {
    await reconcileContractsTo(snapshot.contracts, currentContracts)
    await queryClient.invalidateQueries({ queryKey: CONTRACTS_QUERY_KEY })
  }
  if (snapshot.refLists) {
    await reconcileRefListsTo(snapshot.refLists)
    await queryClient.invalidateQueries({ queryKey: REFERENCE_LISTS_QUERY_KEY })
  }
}

/** Ported from doUndo/doUndoTo/doUndoSelected (index.html:1995-2040). */
export function useUndo() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const undoStackLength = useActivityStore((s) => s.undoStack.length)
  const lastUndoLabel = useActivityStore((s) => s.undoStack.at(-1)?.label ?? "")
  const activityLogQuery = useActivityLogQuery()

  async function undoTo(entryId: string): Promise<{ target: UndoEntry; discardedCount: number } | null> {
    const { undoStack } = useActivityStore.getState()
    const idx = undoStack.findIndex((e) => e.id === entryId)
    if (idx === -1) return null
    const target = undoStack[idx]
    const discardedCount = undoStack.length - idx
    const currentInvoices = (queryClient.getQueryData(INVOICES_QUERY_KEY) as Invoice[] | undefined) ?? []
    const currentContracts = (queryClient.getQueryData(CONTRACTS_QUERY_KEY) as Contract[] | undefined) ?? []

    await reconcileSnapshot(target.snapshot, queryClient, currentInvoices, currentContracts)
    useActivityStore.setState({ undoStack: undoStack.slice(0, idx) })
    return { target, discardedCount }
  }

  function logUndo(detail: string) {
    void logActivity(queryClient, { name: user?.name || "Unknown", role: user?.role || "" }, "Undo", detail)
  }

  async function undoLast() {
    const { undoStack } = useActivityStore.getState()
    if (!undoStack.length) {
      toast.error("Nothing to undo.")
      return
    }
    const last = undoStack[undoStack.length - 1]
    const r = await undoTo(last.id)
    if (!r) return
    logUndo(`Reverted: ${r.target.label}`)
    toast.success(`Undone: ${r.target.label}`)
  }

  async function undoSelected(logIds: Set<string>): Promise<boolean> {
    if (!logIds.size) {
      toast.error("Select at least one change to undo.")
      return false
    }
    const { undoStack } = useActivityStore.getState()
    const log = activityLogQuery.data ?? []
    const undoIds = new Set<string>()
    log.forEach((e) => {
      if (logIds.has(e.id) && e.meta?.undoId) undoIds.add(String(e.meta.undoId))
    })
    let earliest: UndoEntry | null = null
    for (const entry of undoStack) {
      if (undoIds.has(entry.id)) {
        earliest = entry
        break
      }
    }
    if (!earliest) {
      toast.error("None of the selected changes can still be undone.")
      return false
    }
    const r = await undoTo(earliest.id)
    if (!r) return false
    const summary = r.discardedCount > 1 ? `${r.discardedCount} changes back through: ${r.target.label}` : r.target.label
    logUndo(`Reverted ${summary}`)
    useActivityStore.getState().clearSelection()
    toast.success(`Reverted ${r.discardedCount} change${r.discardedCount !== 1 ? "s" : ""}.`)
    return true
  }

  return { undoStackLength, lastUndoLabel, undoLast, undoSelected }
}
