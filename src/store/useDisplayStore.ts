import { create } from "zustand"
import { applyPalette, CUSTOM_PALETTE_ID, DEFAULT_PALETTE_ID, getPalette, type PaletteVars } from "@/lib/colorPalettes"
import { storeGet, storeSet } from "@/lib/localCache"

export type CardScale = "compact" | "comfortable" | "spacious"
export type Radius = "none" | "sm" | "md" | "lg"
export type BorderWidth = "thin" | "medium" | "thick"
export type BorderStyle = "solid" | "dashed" | "dotted"
export type Shadow = "flat" | "soft" | "elevated"
export type IconWeight = "light" | "regular" | "bold"
export type ChartType = "bar" | "line" | "area" | "pie" | "radar"
export type BuiltinFont = "inter" | "nunito" | "roboto" | "open-sans" | "montserrat" | "poppins" | "system" | "serif" | "mono"
export type FontSize = "sm" | "md" | "lg"

export interface CustomFont {
  id: string
  fileName: string
  dataUrl: string
}

const PREFS_KEY = "displayPrefs"

interface DisplayPrefs {
  colorTheme: string
  customColors: PaletteVars | null
  cardScale: CardScale
  radius: Radius
  borderWidth: BorderWidth
  borderStyle: BorderStyle
  shadow: Shadow
  iconWeight: IconWeight
  animationsEnabled: boolean
  /** Either a BuiltinFont key or a CustomFont's id. */
  fontFamily: string
  fontSize: FontSize
  customFonts: CustomFont[]
  trendChartType: ChartType
  serviceChartType: ChartType
  vendorChartType: ChartType
  breakdownChartType: ChartType
  tableBanded: boolean
  tableHeaderShaded: boolean
  tableGridLines: boolean
}

type ChartKey = "trendChartType" | "serviceChartType" | "vendorChartType" | "breakdownChartType"

interface DisplayState extends DisplayPrefs {
  setColorTheme: (id: string) => void
  setCustomColor: (key: keyof PaletteVars, value: string) => void
  setCardScale: (scale: CardScale) => void
  setRadius: (radius: Radius) => void
  setBorderWidth: (w: BorderWidth) => void
  setBorderStyle: (s: BorderStyle) => void
  setShadow: (s: Shadow) => void
  setIconWeight: (w: IconWeight) => void
  setAnimationsEnabled: (v: boolean) => void
  setFontFamily: (f: string) => void
  setFontSize: (s: FontSize) => void
  uploadCustomFont: (file: File) => Promise<{ ok: boolean; error?: string }>
  removeCustomFont: (id: string) => void
  setChartType: (key: ChartKey, type: ChartType) => void
  setTableBanded: (v: boolean) => void
  setTableHeaderShaded: (v: boolean) => void
  setTableGridLines: (v: boolean) => void
}

const RADIUS_VALUES: Record<Radius, string> = { none: "0rem", sm: "0.25rem", md: "0.625rem", lg: "1rem" }
const BORDER_WIDTH_VALUES: Record<BorderWidth, string> = { thin: "1px", medium: "1.5px", thick: "2px" }
const SHADOW_VALUES: Record<Shadow, string> = {
  flat: "none",
  soft: "0 1px 3px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.04)",
  elevated: "0 8px 20px rgb(0 0 0 / 0.10), 0 2px 6px rgb(0 0 0 / 0.06)",
}
const ICON_STROKE_VALUES: Record<IconWeight, string> = { light: "1.5", regular: "2", bold: "2.5" }
export const FONT_FAMILY_VALUES: Record<BuiltinFont, string> = {
  inter: "'Inter Variable', sans-serif",
  nunito: "'Nunito Variable', sans-serif",
  roboto: "'Roboto Variable', sans-serif",
  "open-sans": "'Open Sans Variable', sans-serif",
  montserrat: "'Montserrat Variable', sans-serif",
  poppins: "'Poppins', sans-serif",
  // Segoe UI/Calibri/Cambria are Microsoft-licensed and can't be bundled with the
  // app — this picks them up from the OS instead, when the app runs on Windows.
  system: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
}
const FONT_SIZE_VALUES: Record<FontSize, string> = { sm: "14px", md: "16px", lg: "18px" }

/** Each uploaded font gets its own unique @font-face family name, so a second upload doesn't overwrite (and hide) the first one's registration. */
export function customFontFaceName(id: string): string {
  return `OGDCL Custom ${id}`
}

function resolveFontCss(fontFamily: string, customFonts: CustomFont[]): string {
  if (fontFamily in FONT_FAMILY_VALUES) return FONT_FAMILY_VALUES[fontFamily as BuiltinFont]
  const custom = customFonts.find((f) => f.id === fontFamily)
  if (custom) return `'${customFontFaceName(custom.id)}', 'Inter Variable', sans-serif`
  return FONT_FAMILY_VALUES.inter
}

function setVar(name: string, value: string): void {
  if (typeof document === "undefined") return
  document.documentElement.style.setProperty(name, value)
}

function applyScale(scale: CardScale): void {
  if (typeof document === "undefined") return
  document.documentElement.dataset.scale = scale
}

function applyRadius(radius: Radius): void {
  setVar("--radius", RADIUS_VALUES[radius])
}

function applyBorder(width: BorderWidth, style: BorderStyle): void {
  setVar("--ogdcl-border-width", BORDER_WIDTH_VALUES[width])
  setVar("--ogdcl-border-style", style)
}

function applyShadow(shadow: Shadow): void {
  setVar("--ogdcl-card-shadow", SHADOW_VALUES[shadow])
}

function applyIconWeight(weight: IconWeight): void {
  setVar("--icon-stroke-width", ICON_STROKE_VALUES[weight])
}

function applyAnimations(enabled: boolean): void {
  if (typeof document === "undefined") return
  document.documentElement.dataset.animations = enabled ? "on" : "off"
}

function applyFontFamily(fontFamily: string, customFonts: CustomFont[]): void {
  setVar("--font-sans", resolveFontCss(fontFamily, customFonts))
}

/** Registers one uploaded font file with the browser under its own unique family name. Must be re-run on every load — FontFace objects aren't persisted, only the data URL is. */
async function registerCustomFont(font: CustomFont): Promise<void> {
  if (typeof document === "undefined" || !("FontFace" in window)) return
  const face = new FontFace(customFontFaceName(font.id), `url(${font.dataUrl})`)
  await face.load()
  document.fonts.add(face)
}

function applyFontSize(size: FontSize): void {
  if (typeof document === "undefined") return
  document.documentElement.style.fontSize = FONT_SIZE_VALUES[size]
}

function loadPrefs(): DisplayPrefs {
  const saved = storeGet<Partial<DisplayPrefs>>(PREFS_KEY)
  return {
    colorTheme: saved?.colorTheme || DEFAULT_PALETTE_ID,
    customColors: saved?.customColors ?? null,
    cardScale: saved?.cardScale || "comfortable",
    radius: saved?.radius || "md",
    borderWidth: saved?.borderWidth || "thin",
    borderStyle: saved?.borderStyle || "solid",
    shadow: saved?.shadow || "flat",
    iconWeight: saved?.iconWeight || "regular",
    animationsEnabled: saved?.animationsEnabled ?? true,
    fontFamily: saved?.fontFamily || "inter",
    fontSize: saved?.fontSize || "md",
    customFonts: saved?.customFonts ?? [],
    trendChartType: saved?.trendChartType || "bar",
    serviceChartType: saved?.serviceChartType || "bar",
    vendorChartType: saved?.vendorChartType || "bar",
    breakdownChartType: saved?.breakdownChartType || "pie",
    tableBanded: saved?.tableBanded ?? true,
    tableHeaderShaded: saved?.tableHeaderShaded ?? true,
    tableGridLines: saved?.tableGridLines ?? false,
  }
}

const initial = loadPrefs()
applyPalette(initial.colorTheme, initial.customColors ?? undefined)
applyScale(initial.cardScale)
applyRadius(initial.radius)
applyBorder(initial.borderWidth, initial.borderStyle)
applyShadow(initial.shadow)
applyIconWeight(initial.iconWeight)
applyAnimations(initial.animationsEnabled)
applyFontSize(initial.fontSize)
// Re-register every saved custom font — FontFace objects don't persist across
// reloads, only the data URLs do. All of them, not just the active one, so
// switching between previously-uploaded fonts doesn't need a re-upload.
Promise.all(initial.customFonts.map((f) => registerCustomFont(f).catch(() => {})))
  .then(() => applyFontFamily(initial.fontFamily, initial.customFonts))
  .catch(() => applyFontFamily("inter", []))

function persist(state: DisplayPrefs): void {
  const {
    colorTheme,
    customColors,
    cardScale,
    radius,
    borderWidth,
    borderStyle,
    shadow,
    iconWeight,
    animationsEnabled,
    fontFamily,
    fontSize,
    customFonts,
    trendChartType,
    serviceChartType,
    vendorChartType,
    breakdownChartType,
    tableBanded,
    tableHeaderShaded,
    tableGridLines,
  } = state
  storeSet(PREFS_KEY, {
    colorTheme,
    customColors,
    cardScale,
    radius,
    borderWidth,
    borderStyle,
    shadow,
    iconWeight,
    animationsEnabled,
    fontFamily,
    fontSize,
    customFonts,
    trendChartType,
    serviceChartType,
    vendorChartType,
    breakdownChartType,
    tableBanded,
    tableHeaderShaded,
    tableGridLines,
  })
}

/** Dashboard/report display customization (Format dialog): color, shape, typography, chart-type, and table preferences, applied app-wide and persisted locally. */
export const useDisplayStore = create<DisplayState>((set, get) => ({
  ...initial,

  setColorTheme: (id) => {
    applyPalette(id, get().customColors ?? undefined)
    set({ colorTheme: id })
    persist(get())
  },

  setCustomColor: (key, value) => {
    const base = get().customColors ?? getPalette(get().colorTheme).light
    const next: PaletteVars = { ...base, [key]: value }
    applyPalette(CUSTOM_PALETTE_ID, next)
    set({ colorTheme: CUSTOM_PALETTE_ID, customColors: next })
    persist(get())
  },

  setCardScale: (scale) => {
    applyScale(scale)
    set({ cardScale: scale })
    persist(get())
  },

  setRadius: (radius) => {
    applyRadius(radius)
    set({ radius })
    persist(get())
  },

  setBorderWidth: (borderWidth) => {
    applyBorder(borderWidth, get().borderStyle)
    set({ borderWidth })
    persist(get())
  },

  setBorderStyle: (borderStyle) => {
    applyBorder(get().borderWidth, borderStyle)
    set({ borderStyle })
    persist(get())
  },

  setShadow: (shadow) => {
    applyShadow(shadow)
    set({ shadow })
    persist(get())
  },

  setIconWeight: (iconWeight) => {
    applyIconWeight(iconWeight)
    set({ iconWeight })
    persist(get())
  },

  setAnimationsEnabled: (animationsEnabled) => {
    applyAnimations(animationsEnabled)
    set({ animationsEnabled })
    persist(get())
  },

  setFontFamily: (fontFamily) => {
    applyFontFamily(fontFamily, get().customFonts)
    set({ fontFamily })
    persist(get())
  },

  setFontSize: (fontSize) => {
    applyFontSize(fontSize)
    set({ fontSize })
    persist(get())
  },

  setChartType: (key, type) => {
    set({ [key]: type } as Pick<DisplayState, ChartKey>)
    persist(get())
  },

  setTableBanded: (tableBanded) => {
    set({ tableBanded })
    persist(get())
  },

  setTableHeaderShaded: (tableHeaderShaded) => {
    set({ tableHeaderShaded })
    persist(get())
  },

  setTableGridLines: (tableGridLines) => {
    set({ tableGridLines })
    persist(get())
  },

  uploadCustomFont: async (file) => {
    const MAX_BYTES = 2 * 1024 * 1024
    if (file.size > MAX_BYTES) {
      return { ok: false, error: "Font file is too large (max 2 MB)." }
    }
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    const font: CustomFont = { id: crypto.randomUUID(), fileName: file.name, dataUrl }
    try {
      await registerCustomFont(font)
    } catch {
      return { ok: false, error: "Could not read that as a font file (try .ttf, .otf, .woff, or .woff2)." }
    }
    const customFonts = [...get().customFonts, font]
    applyFontFamily(font.id, customFonts)
    set({ fontFamily: font.id, customFonts })
    persist(get())
    return { ok: true }
  },

  removeCustomFont: (id) => {
    const customFonts = get().customFonts.filter((f) => f.id !== id)
    const wasActive = get().fontFamily === id
    const fontFamily = wasActive ? "inter" : get().fontFamily
    if (wasActive) applyFontFamily(fontFamily, customFonts)
    set({ customFonts, fontFamily })
    persist(get())
  },
}))
