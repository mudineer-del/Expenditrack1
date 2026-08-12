import { create } from "zustand"
import { applyPalette, DEFAULT_PALETTE_ID } from "@/lib/colorPalettes"
import { storeGet, storeSet } from "@/lib/localCache"

export type CardScale = "compact" | "comfortable" | "spacious"

const PREFS_KEY = "displayPrefs"

interface DisplayPrefs {
  colorTheme: string
  cardScale: CardScale
}

interface DisplayState extends DisplayPrefs {
  setColorTheme: (id: string) => void
  setCardScale: (scale: CardScale) => void
}

function applyScale(scale: CardScale): void {
  if (typeof document === "undefined") return
  document.documentElement.dataset.scale = scale
}

function loadPrefs(): DisplayPrefs {
  const saved = storeGet<Partial<DisplayPrefs>>(PREFS_KEY)
  return {
    colorTheme: saved?.colorTheme || DEFAULT_PALETTE_ID,
    cardScale: saved?.cardScale || "comfortable",
  }
}

const initial = loadPrefs()
applyPalette(initial.colorTheme)
applyScale(initial.cardScale)

/** Dashboard/report display customization (Format dialog): accent/chart color style and KPI-card/chart scale. */
export const useDisplayStore = create<DisplayState>((set, get) => ({
  ...initial,

  setColorTheme: (id) => {
    applyPalette(id)
    set({ colorTheme: id })
    storeSet(PREFS_KEY, { colorTheme: id, cardScale: get().cardScale })
  },

  setCardScale: (scale) => {
    applyScale(scale)
    set({ cardScale: scale })
    storeSet(PREFS_KEY, { colorTheme: get().colorTheme, cardScale: scale })
  },
}))
