export interface PaletteVars {
  primary: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
}

export interface Palette {
  id: string
  label: string
  swatch: string
  light: PaletteVars
  dark: PaletteVars
}

/** Color styles for the app accent + charts. "ocean" matches the original hand-tuned theme in index.css. */
export const PALETTES: Palette[] = [
  {
    id: "ocean",
    label: "Ocean",
    swatch: "#0A86C8",
    light: { primary: "#0A86C8", chart1: "#0A86C8", chart2: "#49BFAC", chart3: "#2c5f8a", chart4: "#0e8a8c", chart5: "#0a2540" },
    dark: { primary: "#3BA3E0", chart1: "#3BA3E0", chart2: "#49BFAC", chart3: "#6fa3c4", chart4: "#2f9e94", chart5: "#8fb4c9" },
  },
  {
    id: "emerald",
    label: "Emerald",
    swatch: "#0E9F6E",
    light: { primary: "#0E9F6E", chart1: "#0E9F6E", chart2: "#2DD4BF", chart3: "#14532D", chart4: "#65A30D", chart5: "#134E4A" },
    dark: { primary: "#34D399", chart1: "#34D399", chart2: "#5EEAD4", chart3: "#86EFAC", chart4: "#A3E635", chart5: "#99F6E4" },
  },
  {
    id: "amber",
    label: "Amber",
    swatch: "#D97706",
    light: { primary: "#D97706", chart1: "#D97706", chart2: "#F59E0B", chart3: "#92400E", chart4: "#CA8A04", chart5: "#7C2D12" },
    dark: { primary: "#FBBF24", chart1: "#FBBF24", chart2: "#FCD34D", chart3: "#FDBA74", chart4: "#FDE68A", chart5: "#FED7AA" },
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "#7C3AED",
    light: { primary: "#7C3AED", chart1: "#7C3AED", chart2: "#C026D3", chart3: "#4C1D95", chart4: "#A21CAF", chart5: "#312E81" },
    dark: { primary: "#A78BFA", chart1: "#A78BFA", chart2: "#E879F9", chart3: "#C4B5FD", chart4: "#F0ABFC", chart5: "#DDD6FE" },
  },
  {
    id: "slate",
    label: "Slate",
    swatch: "#334155",
    light: { primary: "#334155", chart1: "#334155", chart2: "#64748B", chart3: "#0F172A", chart4: "#94A3B8", chart5: "#1E293B" },
    dark: { primary: "#94A3B8", chart1: "#94A3B8", chart2: "#CBD5E1", chart3: "#64748B", chart4: "#E2E8F0", chart5: "#475569" },
  },
]

export const DEFAULT_PALETTE_ID = "ocean"
export const CUSTOM_PALETTE_ID = "custom"

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

const STYLE_TAG_ID = "ogdcl-color-style"

function varsBlock(v: PaletteVars): string {
  // !important is deliberate: this tag exists solely to override the static
  // defaults in index.css at runtime, and (in dev) Vite can re-inject that
  // stylesheet's <style> tag after this one, making plain source-order
  // precedence unreliable. !important makes the override win regardless.
  const entries: [string, string][] = [
    ["--primary", v.primary],
    ["--ring", v.primary],
    ["--sidebar-primary", v.primary],
    ["--sidebar-ring", v.primary],
    ["--chart-1", v.chart1],
    ["--chart-2", v.chart2],
    ["--chart-3", v.chart3],
    ["--chart-4", v.chart4],
    ["--chart-5", v.chart5],
  ]
  return entries.map(([k, val]) => `${k}:${val} !important;`).join("")
}

/** Injects/updates a <style> tag overriding the default palette CSS vars for both light and dark mode. */
export function applyPaletteVars(light: PaletteVars, dark: PaletteVars): void {
  if (typeof document === "undefined") return
  let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement("style")
    el.id = STYLE_TAG_ID
    document.head.appendChild(el)
  }
  el.textContent = `:root{${varsBlock(light)}}.dark{${varsBlock(dark)}}`
}

/**
 * id is either a preset id (applies that preset's light/dark pair) or
 * CUSTOM_PALETTE_ID (applies customVars to both light and dark — individually
 * tuning light vs dark isn't exposed in the UI, to keep the Format dialog's
 * "Advanced colors" section to one set of pickers rather than two).
 */
export function applyPalette(id: string, customVars?: PaletteVars): void {
  if (id === CUSTOM_PALETTE_ID && customVars) {
    applyPaletteVars(customVars, customVars)
    return
  }
  const palette = getPalette(id)
  applyPaletteVars(palette.light, palette.dark)
}
