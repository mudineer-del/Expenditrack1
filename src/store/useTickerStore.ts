import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"

export type TickerStyle = "scroll" | "cycle"

const TICKER_KEY = "spendingTickerStyle"

interface TickerState {
  style: TickerStyle
  setStyle: (style: TickerStyle) => void
}

/** Dashboard spending-story ticker's display style (Settings > Labels), local per device. */
export const useTickerStore = create<TickerState>((set) => ({
  style: storeGet<TickerStyle>(TICKER_KEY) || "scroll",
  setStyle: (style) => {
    set({ style })
    storeSet(TICKER_KEY, style)
  },
}))
