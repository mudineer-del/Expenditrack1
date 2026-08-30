import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"

export type SidebarIconStyle = "chip" | "flat"
export type SidebarActiveColorMode = "theme" | "perItem"
export type SidebarDensity = "comfortable" | "compact"

const PREFS_KEY = "sidebarPrefs"

interface SidebarPrefs {
  iconStyle: SidebarIconStyle
  activeColorMode: SidebarActiveColorMode
  density: SidebarDensity
  /** Nav item `to` paths hidden from the sidebar — Dashboard is excluded from the
   *  hideable set in the UI so the nav can never be emptied out entirely. */
  hiddenItems: string[]
}

const DEFAULT_PREFS: SidebarPrefs = {
  iconStyle: "chip",
  activeColorMode: "theme",
  density: "comfortable",
  hiddenItems: [],
}

interface SidebarPrefsState extends SidebarPrefs {
  setIconStyle: (v: SidebarIconStyle) => void
  setActiveColorMode: (v: SidebarActiveColorMode) => void
  setDensity: (v: SidebarDensity) => void
  toggleItem: (to: string) => void
  resetSidebarPrefs: () => void
}

function loadPrefs(): SidebarPrefs {
  const saved = storeGet<Partial<SidebarPrefs>>(PREFS_KEY)
  return { ...DEFAULT_PREFS, ...saved }
}

function persist(state: SidebarPrefs): void {
  const { iconStyle, activeColorMode, density, hiddenItems } = state
  storeSet(PREFS_KEY, { iconStyle, activeColorMode, density, hiddenItems })
}

/**
 * Sidebar look/behavior customization (Settings > Labels) — icon style, active-pill
 * color mode, row density, and per-item visibility. Local-only per browser, same
 * pattern as useLabelsStore/useTickerStore/useProminentContractsStore.
 */
export const useSidebarPrefsStore = create<SidebarPrefsState>((set, get) => ({
  ...loadPrefs(),

  setIconStyle: (iconStyle) => {
    set({ iconStyle })
    persist(get())
  },
  setActiveColorMode: (activeColorMode) => {
    set({ activeColorMode })
    persist(get())
  },
  setDensity: (density) => {
    set({ density })
    persist(get())
  },
  toggleItem: (to) => {
    const current = get().hiddenItems
    const hiddenItems = current.includes(to) ? current.filter((x) => x !== to) : [...current, to]
    set({ hiddenItems })
    persist(get())
  },
  resetSidebarPrefs: () => {
    set(DEFAULT_PREFS)
    persist(DEFAULT_PREFS)
  },
}))
