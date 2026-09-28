import { create } from "zustand"
import type { Invoice } from "@/types/invoice"

export interface InvoiceHistoryEntry {
  invoice: Invoice
  action: "create" | "update" | "delete"
  timestamp: number
}

interface InvoiceUndoRedoState {
  history: InvoiceHistoryEntry[]
  historyIndex: number
  maxHistorySize: number

  push: (entry: InvoiceHistoryEntry) => void
  undo: () => InvoiceHistoryEntry | null
  redo: () => InvoiceHistoryEntry | null
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
  getLastChange: () => InvoiceHistoryEntry | null
}

const MAX_HISTORY_SIZE = 50

/**
 * Simple undo/redo store for invoice changes. Tracks the last N changes
 * so users can revert recent edits without losing data.
 *
 * Note: This is an in-memory store and will be cleared on page reload.
 * For persistent undo/redo, you'd need to integrate with the backend.
 */
export const useInvoiceUndoRedoStore = create<InvoiceUndoRedoState>((set, get) => ({
  history: [],
  historyIndex: -1,
  maxHistorySize: MAX_HISTORY_SIZE,

  push: (entry) =>
    set((state) => {
      const newHistory = state.history.slice(0, state.historyIndex + 1)
      newHistory.push(entry)
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift()
      }
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      }
    }),

  undo: () => {
    const state = get()
    if (state.historyIndex <= 0) return null

    const newIndex = state.historyIndex - 1
    set({ historyIndex: newIndex })
    return state.history[newIndex] || null
  },

  redo: () => {
    const state = get()
    if (state.historyIndex >= state.history.length - 1) return null

    const newIndex = state.historyIndex + 1
    set({ historyIndex: newIndex })
    return state.history[newIndex] || null
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  clear: () => set({ history: [], historyIndex: -1 }),

  getLastChange: () => {
    const state = get()
    if (state.historyIndex < 0) return null
    return state.history[state.historyIndex] || null
  },
}))
