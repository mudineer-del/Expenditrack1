import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"
import type { Invoice } from "@/types/invoice"

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

export interface UndoEntry {
  id: string
  ts: number
  label: string
  snapshot: Invoice[]
}

/** Ported from MAX_LOG/MAX_UNDO (index.html:1958-1959). */
const MAX_LOG = 300
const MAX_UNDO = 20
const LOG_KEY = "activityLog"

interface ActivityState {
  log: ActivityEntry[]
  undoStack: UndoEntry[]
  selectedLogIds: Set<string>
  logActivity: (actor: { name: string; role: string }, action: ActivityAction, detail: string, meta?: ActivityMeta) => ActivityEntry
  pushUndo: (label: string, snapshot: Invoice[]) => string
  clearLog: () => void
  toggleSelect: (id: string) => void
  setSelection: (ids: Set<string>) => void
  clearSelection: () => void
}

/**
 * Ported from the legacy app's activity-log + undo-stack globals
 * (index.html:1957-2040). The log persists to localStorage (matching the
 * legacy behavior); the undo stack is intentionally in-memory only, exactly
 * like the legacy `state.undoStack` — it was never persisted there either,
 * so a page reload clearing undo history is faithful, not a regression.
 */
export const useActivityStore = create<ActivityState>((set, get) => ({
  log: storeGet<ActivityEntry[]>(LOG_KEY) || [],
  undoStack: [],
  selectedLogIds: new Set(),

  logActivity: (actor, action, detail, meta) => {
    const entry: ActivityEntry = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      user: actor.name || "Unknown",
      role: actor.role || "",
      action,
      detail,
      meta: meta ?? null,
    }
    const log = [entry, ...get().log].slice(0, MAX_LOG)
    storeSet(LOG_KEY, log)
    set({ log })
    return entry
  },

  pushUndo: (label, snapshot) => {
    const entry: UndoEntry = { id: crypto.randomUUID(), ts: Date.now(), label, snapshot: JSON.parse(JSON.stringify(snapshot)) }
    const stack = [...get().undoStack, entry]
    if (stack.length > MAX_UNDO) stack.shift()
    set({ undoStack: stack })
    return entry.id
  },

  clearLog: () => {
    storeSet(LOG_KEY, [])
    set({ log: [] })
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
