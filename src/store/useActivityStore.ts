import { create } from "zustand"
import type { Contract } from "@/types/contract"
import type { Invoice } from "@/types/invoice"
import type { Well } from "@/types/well"
import type { WellCostCentre, WellCostTransaction } from "@/types/wellCost"
import type { ReferenceLists } from "@/lib/referenceLists"

export type ActivityAction = "Import" | "Add" | "Edit" | "Delete" | "Undo" | "Restore"

export interface ActivityMeta {
  undoId?: string
  [key: string]: unknown
}

export interface ActivityEntry {
  id: string
  ts: number
  user: string
  role: string
  action: ActivityAction
  detail: string
  meta: ActivityMeta | null
}

/** Whichever of these are present get reconciled back on undo — a plain
 *  invoice edit only snapshots invoices, but a backup restore touches all
 *  three, so its undo needs to revert all three too. */
export interface Snapshot {
  invoices?: Invoice[]
  contracts?: Contract[]
  refLists?: ReferenceLists
  wells?: Well[]
  wellCostCentres?: WellCostCentre[]
  wellCostTransactions?: WellCostTransaction[]
}

export interface UndoEntry {
  id: string
  ts: number
  label: string
  snapshot: Snapshot
}

/** Ported from MAX_UNDO (index.html:1959). */
const MAX_UNDO = 20

interface ActivityState {
  undoStack: UndoEntry[]
  selectedLogIds: Set<string>
  pushUndo: (label: string, snapshot: Snapshot) => string
  toggleSelect: (id: string) => void
  setSelection: (ids: Set<string>) => void
  clearSelection: () => void
}

/**
 * The undo stack and current log-page selection — both local/in-memory only,
 * exactly like the legacy `state.undoStack` (index.html:1957-2040), which was
 * never persisted either: a page reload clearing undo history is faithful,
 * not a regression. The activity *log* itself now lives in Supabase (see
 * useActivityLog.ts) so it's shared across devices/users, unlike this state.
 */
export const useActivityStore = create<ActivityState>((set, get) => ({
  undoStack: [],
  selectedLogIds: new Set(),

  pushUndo: (label, snapshot) => {
    const entry: UndoEntry = { id: crypto.randomUUID(), ts: Date.now(), label, snapshot: JSON.parse(JSON.stringify(snapshot)) }
    const stack = [...get().undoStack, entry]
    if (stack.length > MAX_UNDO) stack.shift()
    set({ undoStack: stack })
    return entry.id
  },

  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedLogIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { selectedLogIds: next }
    }),
  setSelection: (ids) => set({ selectedLogIds: ids }),
  clearSelection: () => set({ selectedLogIds: new Set() }),
}))
