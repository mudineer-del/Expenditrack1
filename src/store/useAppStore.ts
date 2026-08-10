import { create } from "zustand"

interface AppState {
  dashVendor: string
  setDashVendor: (v: string) => void
}

/**
 * Global UI state (page/drawers/filters/sort/selection in the legacy app's
 * single `state` object, index.html:1911). Grows one field at a time as
 * each phase needs it, rather than pre-declaring the whole legacy shape.
 */
export const useAppStore = create<AppState>((set) => ({
  dashVendor: "ALL",
  setDashVendor: (v) => set({ dashVendor: v }),
}))
