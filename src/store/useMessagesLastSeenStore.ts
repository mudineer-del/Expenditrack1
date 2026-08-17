import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"

const KEY = "lastSeenMessagesTs"

interface MessagesLastSeenState {
  /** Epoch ms of the last time this browser viewed the Message Centre. 0 until first visit. */
  lastSeenTs: number
  markSeen: (ts: number) => void
}

/** Per-device, mirrors useLastSeenStore's pattern for the Activity Log. */
export const useMessagesLastSeenStore = create<MessagesLastSeenState>((set) => ({
  lastSeenTs: storeGet<number>(KEY) ?? 0,
  markSeen: (ts) => {
    storeSet(KEY, ts)
    set({ lastSeenTs: ts })
  },
}))
