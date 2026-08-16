import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"

const KEY = "lastSeenActivityTs"

interface LastSeenState {
  /** Epoch ms of the last time this browser viewed the Activity Log. 0 until first visit. */
  lastSeenTs: number
  markSeen: (ts: number) => void
}

/** Per-device (not synced across the team), same local-only pattern as useLabelsStore —
 *  "what have I already seen" is inherently a personal reading-position concern. */
export const useLastSeenStore = create<LastSeenState>((set) => ({
  lastSeenTs: storeGet<number>(KEY) ?? 0,
  markSeen: (ts) => {
    storeSet(KEY, ts)
    set({ lastSeenTs: ts })
  },
}))
