import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"

export interface AppLabels {
  sidebarTitle: string
  sidebarSubtitle: string
  loginTitle: string
  dashboardTitle: string
}

const LABELS_KEY = "appLabels"

export const DEFAULT_LABELS: AppLabels = {
  sidebarTitle: "OGDCL",
  sidebarSubtitle: "Drilling Fluids Tracker",
  loginTitle: "OGDCL Drilling Fluids",
  dashboardTitle: "Dashboard",
}

interface LabelsState extends AppLabels {
  setLabel: (key: keyof AppLabels, value: string) => void
  resetLabels: () => void
}

function loadLabels(): AppLabels {
  const saved = storeGet<Partial<AppLabels>>(LABELS_KEY)
  return { ...DEFAULT_LABELS, ...saved }
}

function persist(state: AppLabels): void {
  const { sidebarTitle, sidebarSubtitle, loginTitle, dashboardTitle } = state
  storeSet(LABELS_KEY, { sidebarTitle, sidebarSubtitle, loginTitle, dashboardTitle })
}

/**
 * Editable UI text (Settings > Labels), same local-only pattern as
 * useDisplayStore's Format preferences — each person customizes their own
 * view rather than this being a shared org-wide setting written to Supabase.
 */
export const useLabelsStore = create<LabelsState>((set, get) => ({
  ...loadLabels(),

  setLabel: (key, value) => {
    set({ [key]: value } as Pick<LabelsState, keyof AppLabels>)
    persist(get())
  },

  resetLabels: () => {
    set(DEFAULT_LABELS)
    persist(get())
  },
}))
