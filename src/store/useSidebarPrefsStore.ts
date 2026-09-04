import { create } from "zustand"
import { storeGet, storeSet } from "@/lib/localCache"

export type SidebarIconStyle = "chip" | "flat"
export type SidebarActiveColorMode = "theme" | "perItem"
export type SidebarDensity = "comfortable" | "compact"

/** A chosen icon for one sidebar slot — either a lucide icon by its (kebab-case) name,
 *  resolved via lucide-react's DynamicIcon so picking one never pulls the other ~1500
 *  icons into the bundle, or a curated 3D image by id (src/lib/iconLibrary3d.ts). */
export type IconRef = { kind: "lucide"; name: string } | { kind: "3d"; id: string }

const PREFS_KEY = "sidebarPrefs"

interface SidebarPrefs {
  iconStyle: SidebarIconStyle
  activeColorMode: SidebarActiveColorMode
  density: SidebarDensity
  /** Nav item `to` paths hidden from the sidebar — Dashboard is excluded from the
   *  hideable set in the UI so the nav can never be emptied out entirely. */
  hiddenItems: string[]
  /** Per-slot icon overrides, keyed by nav item `to` path, or "__department" /
   *  "__allDepartments" for the department switcher's two icon slots — see
   *  src/lib/iconOverrides.ts's resolveIcon(), the one place these get read. */
  iconOverrides: Record<string, IconRef>
}

const DEFAULT_PREFS: SidebarPrefs = {
  iconStyle: "chip",
  activeColorMode: "theme",
  density: "comfortable",
  hiddenItems: [],
  iconOverrides: {},
}

interface SidebarPrefsState extends SidebarPrefs {
  setIconStyle: (v: SidebarIconStyle) => void
  setActiveColorMode: (v: SidebarActiveColorMode) => void
  setDensity: (v: SidebarDensity) => void
  toggleItem: (to: string) => void
  /** Pass null to clear back to that slot's default icon. */
  setIconOverride: (key: string, ref: IconRef | null) => void
  resetSidebarPrefs: () => void
}

function loadPrefs(): SidebarPrefs {
  const saved = storeGet<Partial<SidebarPrefs>>(PREFS_KEY)
  return { ...DEFAULT_PREFS, ...saved }
}

function persist(state: SidebarPrefs): void {
  const { iconStyle, activeColorMode, density, hiddenItems, iconOverrides } = state
  storeSet(PREFS_KEY, { iconStyle, activeColorMode, density, hiddenItems, iconOverrides })
}

/**
 * Sidebar look/behavior customization (Settings > Labels) — icon style, active-pill
 * color mode, row density, per-item visibility, and per-item icon overrides. Local-only
 * per browser, same pattern as useLabelsStore/useTickerStore/useProminentContractsStore.
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
  setIconOverride: (key, ref) => {
    const current = { ...get().iconOverrides }
    if (ref) current[key] = ref
    else delete current[key]
    set({ iconOverrides: current })
    persist(get())
  },
  resetSidebarPrefs: () => {
    set(DEFAULT_PREFS)
    persist(DEFAULT_PREFS)
  },
}))
