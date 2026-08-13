import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"

const PROMINENT_KEY = "prominentContractIds"

interface ProminentContractsState {
  ids: string[]
  toggle: (id: string) => void
  isProminent: (id: string) => boolean
}

function loadIds(): string[] {
  return storeGet<string[]>(PROMINENT_KEY) ?? []
}

function persist(ids: string[]): void {
  storeSet(PROMINENT_KEY, ids)
}

/**
 * Contracts pinned to the sidebar's "Active Contracts" widget (Settings > Labels).
 * Local-only per browser, same pattern as useLabelsStore — lets each person
 * feature the contracts that matter to them instead of relying purely on the
 * soonest-expiring auto-selection.
 */
export const useProminentContractsStore = create<ProminentContractsState>((set, get) => ({
  ids: loadIds(),

  toggle: (id) => {
    const current = get().ids
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    set({ ids: next })
    persist(next)
  },

  isProminent: (id) => get().ids.includes(id),
}))
