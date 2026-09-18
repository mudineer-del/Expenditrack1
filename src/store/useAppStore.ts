import { create } from "zustand"

interface AppState {
  dashVendor: string
  setDashVendor: (v: string) => void
  /** "ALL" or a department name — the one active-department selection shared by the
   *  sidebar's DepartmentSwitcher and the Dashboard's top tabs, so switching either one
   *  updates the other. Scopes invoices/contracts on every page, same as dashVendor. */
  activeDept: string
  setActiveDept: (v: string) => void
}

/**
 * Global UI state (page/drawers/filters/sort/selection in the legacy app's
 * single `state` object, index.html:1911). Grows one field at a time as
 * each phase needs it, rather than pre-declaring the whole legacy shape.
 */
export const useAppStore = create<AppState>((set) => ({
  dashVendor: "ALL",
  setDashVendor: (v) => set({ dashVendor: v }),
  activeDept: "ALL",
  // Resets the contractor filter along with the department — the contractor pills are
  // always rebuilt from whichever department is now active (see DashboardPage's
  // dataVendors), so a contractor picked under the old department can otherwise stay
  // "selected" after switching to one it doesn't belong to, silently filtering
  // everything down to zero rows.
  setActiveDept: (v) => set({ activeDept: v, dashVendor: "ALL" }),
}))
