export interface PaletteVars {
  primary: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
}

export interface ThemeVars extends PaletteVars {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  border: string
  input: string
  dataviz1: string
  dataviz2: string
  dataviz3: string
  dataviz4: string
  dataviz5: string
  dataviz6: string
  statusCleared: string
  statusUnder: string
  statusReturned: string
  sidebar: string
  sidebarForeground: string
  sidebarPrimaryForeground: string
  sidebarAccent: string
  sidebarAccentForeground: string
  sidebarBorder: string
}

export interface Palette {
  id: string
  label: string
  description: string
  swatch: string
  light: ThemeVars
  dark: ThemeVars
}

const shared = (v: Omit<ThemeVars, "chart1" | "chart2" | "chart3" | "chart4" | "chart5">): ThemeVars => ({
  ...v,
  chart1: v.primary,
  chart2: v.dataviz2,
  chart3: v.dataviz3,
  chart4: v.dataviz4,
  chart5: v.dataviz5,
})

/** Theme families keep accents separate from muted green/amber/red semantics. */
export const PALETTES: Palette[] = [
  {
    id: "petrol", label: "Petrol", description: "Blue-black ground with a petroleum-blue signal.", swatch: "#2E90FF",
    light: shared({ background: "#F4F8FC", foreground: "#102132", card: "#FFFFFF", cardForeground: "#102132", popover: "#FFFFFF", popoverForeground: "#102132", primary: "#1C6FB8", primaryForeground: "#FFFFFF", secondary: "#EAF1F7", secondaryForeground: "#19344B", muted: "#EDF3F8", mutedForeground: "#526678", accent: "#E4EFF8", accentForeground: "#164E7A", destructive: "#B85D68", border: "#D8E3EC", input: "#D8E3EC", dataviz1: "#267FC7", dataviz2: "#2E9FA7", dataviz3: "#8B79D8", dataviz4: "#B2759A", dataviz5: "#567A9C", dataviz6: "#7898A8", statusCleared: "#4D9A76", statusUnder: "#B08352", statusReturned: "#B96770", sidebar: "#F0F6FB", sidebarForeground: "#102132", sidebarPrimaryForeground: "#FFFFFF", sidebarAccent: "#E3EDF6", sidebarAccentForeground: "#164E7A", sidebarBorder: "#D8E3EC" }),
    dark: shared({ background: "#070B11", foreground: "#E7F0F8", card: "#0D151F", cardForeground: "#E7F0F8", popover: "#101A26", popoverForeground: "#E7F0F8", primary: "#2E90FF", primaryForeground: "#06111F", secondary: "#121E2B", secondaryForeground: "#D8E8F5", muted: "#131E2A", mutedForeground: "#91A7BB", accent: "#16283A", accentForeground: "#B9D8F2", destructive: "#D27A83", border: "#223242", input: "#26394B", dataviz1: "#2E90FF", dataviz2: "#43AEB2", dataviz3: "#927FE1", dataviz4: "#C17FA8", dataviz5: "#7196B8", dataviz6: "#8BB0BC", statusCleared: "#67A889", statusUnder: "#C39A68", statusReturned: "#CF7C86", sidebar: "#091019", sidebarForeground: "#E7F0F8", sidebarPrimaryForeground: "#06111F", sidebarAccent: "#142231", sidebarAccentForeground: "#B9D8F2", sidebarBorder: "#223242" }),
  },
  {
    id: "vesper", label: "Vesper", description: "Violet-black, soft-edged, and deliberately designed.", swatch: "#8B7CFF",
    light: shared({ background: "#F7F6FC", foreground: "#1B1A30", card: "#FFFFFF", cardForeground: "#1B1A30", popover: "#FFFFFF", popoverForeground: "#1B1A30", primary: "#6659D8", primaryForeground: "#FFFFFF", secondary: "#EFEEFA", secondaryForeground: "#332C68", muted: "#F0EFF8", mutedForeground: "#686583", accent: "#E9E7FB", accentForeground: "#4B41A1", destructive: "#B96572", border: "#DFDDF0", input: "#DFDDF0", dataviz1: "#7062DD", dataviz2: "#4C9AA0", dataviz3: "#B27D50", dataviz4: "#B06E9E", dataviz5: "#5F7BA5", dataviz6: "#8A83A9", statusCleared: "#5B9878", statusUnder: "#AF875B", statusReturned: "#B96D78", sidebar: "#F3F1FB", sidebarForeground: "#1B1A30", sidebarPrimaryForeground: "#FFFFFF", sidebarAccent: "#E9E7F7", sidebarAccentForeground: "#4B41A1", sidebarBorder: "#DFDDF0" }),
    dark: shared({ background: "#0A0A14", foreground: "#F0EEFF", card: "#11111F", cardForeground: "#F0EEFF", popover: "#151525", popoverForeground: "#F0EEFF", primary: "#8B7CFF", primaryForeground: "#100E25", secondary: "#19182A", secondaryForeground: "#E2DEFF", muted: "#181827", mutedForeground: "#A4A0C0", accent: "#211E3A", accentForeground: "#D1CBFF", destructive: "#D0808A", border: "#2B2941", input: "#34304C", dataviz1: "#8B7CFF", dataviz2: "#62B3B1", dataviz3: "#C49A68", dataviz4: "#D28ABD", dataviz5: "#85A6CC", dataviz6: "#AAA2C7", statusCleared: "#74A88C", statusUnder: "#C2A477", statusReturned: "#D1848D", sidebar: "#0D0D19", sidebarForeground: "#F0EEFF", sidebarPrimaryForeground: "#100E25", sidebarAccent: "#1D1C31", sidebarAccentForeground: "#D1CBFF", sidebarBorder: "#2B2941" }),
  },
  {
    id: "bone", label: "Bone", description: "Cool paper, petroleum ink, and no green UI accent.", swatch: "#1C5D8C",
    light: shared({ background: "#E7E8E6", foreground: "#182832", card: "#F4F5F3", cardForeground: "#182832", popover: "#F6F7F5", popoverForeground: "#182832", primary: "#1C5D8C", primaryForeground: "#F7FBFE", secondary: "#DDE2E2", secondaryForeground: "#243D4A", muted: "#DDE2E1", mutedForeground: "#60717A", accent: "#D2E1E9", accentForeground: "#164B70", destructive: "#AC5C67", border: "#C9D2D3", input: "#C3CDCF", dataviz1: "#1C5D8C", dataviz2: "#397F82", dataviz3: "#766CA4", dataviz4: "#9A6684", dataviz5: "#526F86", dataviz6: "#7B8E93", statusCleared: "#4A8C6B", statusUnder: "#A47D4E", statusReturned: "#AC626B", sidebar: "#E0E2E1", sidebarForeground: "#182832", sidebarPrimaryForeground: "#F7FBFE", sidebarAccent: "#D4DFE1", sidebarAccentForeground: "#164B70", sidebarBorder: "#C9D2D3" }),
    dark: shared({ background: "#101A21", foreground: "#E8F0F2", card: "#17242C", cardForeground: "#E8F0F2", popover: "#1C2A33", popoverForeground: "#E8F0F2", primary: "#6BA7D1", primaryForeground: "#10202A", secondary: "#20313A", secondaryForeground: "#DDEAF0", muted: "#202F37", mutedForeground: "#9EAFB7", accent: "#263D4A", accentForeground: "#C6E0EE", destructive: "#CC7A84", border: "#30434D", input: "#3A4E58", dataviz1: "#6BA7D1", dataviz2: "#72B4B0", dataviz3: "#AA9DD5", dataviz4: "#C18DAD", dataviz5: "#8CAFC4", dataviz6: "#A8B9BC", statusCleared: "#6EA68A", statusUnder: "#BD9D6C", statusReturned: "#CC8189", sidebar: "#121E26", sidebarForeground: "#E8F0F2", sidebarPrimaryForeground: "#10202A", sidebarAccent: "#22353F", sidebarAccentForeground: "#C6E0EE", sidebarBorder: "#30434D" }),
  },
  {
    id: "ink", label: "Ink", description: "Warm graphite with a near-white signal and muted semantics.", swatch: "#E9E9EB",
    light: shared({ background: "#F1F0ED", foreground: "#1F2024", card: "#FAF9F7", cardForeground: "#1F2024", popover: "#FBFAF8", popoverForeground: "#1F2024", primary: "#37383D", primaryForeground: "#FAFAF8", secondary: "#E5E3E0", secondaryForeground: "#2A2B30", muted: "#EAE8E5", mutedForeground: "#73747A", accent: "#E1E0DE", accentForeground: "#303136", destructive: "#A9676D", border: "#D8D6D2", input: "#D0CECA", dataviz1: "#3A3B40", dataviz2: "#5D5E64", dataviz3: "#818288", dataviz4: "#A4A5AA", dataviz5: "#C5C6C9", dataviz6: "#E0E0E2", statusCleared: "#708D7C", statusUnder: "#9A8566", statusReturned: "#9F7177", sidebar: "#EBE9E6", sidebarForeground: "#1F2024", sidebarPrimaryForeground: "#FAFAF8", sidebarAccent: "#E0DEDB", sidebarAccentForeground: "#303136", sidebarBorder: "#D8D6D2" }),
    dark: shared({ background: "#0C0C0E", foreground: "#F0F0F1", card: "#141416", cardForeground: "#F0F0F1", popover: "#19191C", popoverForeground: "#F0F0F1", primary: "#E9E9EB", primaryForeground: "#171719", secondary: "#202023", secondaryForeground: "#E6E6E8", muted: "#1D1D20", mutedForeground: "#A7A7AD", accent: "#27272A", accentForeground: "#F0F0F1", destructive: "#C68A90", border: "#2D2D31", input: "#3A3A3F", dataviz1: "#EEEEF0", dataviz2: "#D4D4D8", dataviz3: "#B9B9BF", dataviz4: "#9D9DA5", dataviz5: "#81818A", dataviz6: "#66666F", statusCleared: "#83A38F", statusUnder: "#B3A079", statusReturned: "#B5848B", sidebar: "#101013", sidebarForeground: "#F0F0F1", sidebarPrimaryForeground: "#171719", sidebarAccent: "#242427", sidebarAccentForeground: "#F0F0F1", sidebarBorder: "#2D2D31" }),
  },
  {
    id: "orchard", label: "Orchard", description: "Warm cream ground with a leaf-green signal and harvest accents.", swatch: "#3E8B57",
    light: shared({ background: "#F6F7F0", foreground: "#1E2A1C", card: "#FFFFFF", cardForeground: "#1E2A1C", popover: "#FFFFFF", popoverForeground: "#1E2A1C", primary: "#3E8B57", primaryForeground: "#FFFFFF", secondary: "#EAF0E4", secondaryForeground: "#264A32", muted: "#EEF2E8", mutedForeground: "#5C6B58", accent: "#E1EDDA", accentForeground: "#2C5A3A", destructive: "#B0605A", border: "#DCE4D4", input: "#DCE4D4", dataviz1: "#3E8B57", dataviz2: "#C98A3C", dataviz3: "#7C9E6B", dataviz4: "#A45A4E", dataviz5: "#4E7A6E", dataviz6: "#8C9A5A", statusCleared: "#4B8A5E", statusUnder: "#B08948", statusReturned: "#AE6259", sidebar: "#EFF3E9", sidebarForeground: "#1E2A1C", sidebarPrimaryForeground: "#FFFFFF", sidebarAccent: "#E3EEDC", sidebarAccentForeground: "#2C5A3A", sidebarBorder: "#DCE4D4" }),
    dark: shared({ background: "#0E140F", foreground: "#EAF0E3", card: "#151D14", cardForeground: "#EAF0E3", popover: "#19221A", popoverForeground: "#EAF0E3", primary: "#5FB878", primaryForeground: "#0C1A0F", secondary: "#1D291D", secondaryForeground: "#DCE8D5", muted: "#1B261B", mutedForeground: "#9CB093", accent: "#233223", accentForeground: "#BEDFB1", destructive: "#D48781", border: "#2A382A", input: "#334533", dataviz1: "#5FB878", dataviz2: "#D9A25C", dataviz3: "#93B784", dataviz4: "#C07A6E", dataviz5: "#6B9C8E", dataviz6: "#A9B778", statusCleared: "#6FAE82", statusUnder: "#C6A56B", statusReturned: "#CC8880", sidebar: "#111811", sidebarForeground: "#EAF0E3", sidebarPrimaryForeground: "#0C1A0F", sidebarAccent: "#1E2B1E", sidebarAccentForeground: "#BEDFB1", sidebarBorder: "#2A382A" }),
  },
  {
    id: "instrument", label: "Instrument", description: "Graphite panel with a precision cyan signal, like a cockpit gauge.", swatch: "#2FB6C4",
    light: shared({ background: "#F2F5F6", foreground: "#141B1E", card: "#FFFFFF", cardForeground: "#141B1E", popover: "#FFFFFF", popoverForeground: "#141B1E", primary: "#0E8A9A", primaryForeground: "#FFFFFF", secondary: "#E6EEF0", secondaryForeground: "#173A40", muted: "#EAF0F1", mutedForeground: "#546366", accent: "#DDEBEE", accentForeground: "#0F5A66", destructive: "#B85F55", border: "#D5E1E3", input: "#D5E1E3", dataviz1: "#0E8A9A", dataviz2: "#D99A3E", dataviz3: "#6C7FA0", dataviz4: "#B0637A", dataviz5: "#4A8C82", dataviz6: "#8B9CA0", statusCleared: "#4A9A73", statusUnder: "#BA8A44", statusReturned: "#B15E5E", sidebar: "#EBF1F2", sidebarForeground: "#141B1E", sidebarPrimaryForeground: "#FFFFFF", sidebarAccent: "#DEEBED", sidebarAccentForeground: "#0F5A66", sidebarBorder: "#D5E1E3" }),
    dark: shared({ background: "#0A0F10", foreground: "#E4F2F3", card: "#101718", cardForeground: "#E4F2F3", popover: "#141D1E", popoverForeground: "#E4F2F3", primary: "#2FB6C4", primaryForeground: "#05191C", secondary: "#152021", secondaryForeground: "#D3E9EB", muted: "#141F20", mutedForeground: "#8FA8AB", accent: "#1B2C2E", accentForeground: "#A9E2E8", destructive: "#D4837B", border: "#233638", input: "#2C4245", dataviz1: "#2FB6C4", dataviz2: "#E3AE5F", dataviz3: "#8296C2", dataviz4: "#C67F97", dataviz5: "#5FAA9E", dataviz6: "#9FB4B8", statusCleared: "#63B08A", statusUnder: "#CBA062", statusReturned: "#CC847E", sidebar: "#0C1315", sidebarForeground: "#E4F2F3", sidebarPrimaryForeground: "#05191C", sidebarAccent: "#182527", sidebarAccentForeground: "#A9E2E8", sidebarBorder: "#233638" }),
  },
  {
    id: "corpo", label: "Corpo", description: "Conservative steel-navy on near-white — a safe boardroom default.", swatch: "#2E4C6E",
    light: shared({ background: "#F4F5F6", foreground: "#1B2530", card: "#FFFFFF", cardForeground: "#1B2530", popover: "#FFFFFF", popoverForeground: "#1B2530", primary: "#2E4C6E", primaryForeground: "#FFFFFF", secondary: "#E9ECEF", secondaryForeground: "#28384A", muted: "#ECEEF0", mutedForeground: "#5E6B78", accent: "#E1E7ED", accentForeground: "#243E58", destructive: "#AA5F62", border: "#DBE0E4", input: "#DBE0E4", dataviz1: "#2E4C6E", dataviz2: "#5C7A94", dataviz3: "#8B7355", dataviz4: "#6E6F8C", dataviz5: "#4F7A72", dataviz6: "#8894A0", statusCleared: "#4C8368", statusUnder: "#A4854F", statusReturned: "#A85F62", sidebar: "#EEF0F2", sidebarForeground: "#1B2530", sidebarPrimaryForeground: "#FFFFFF", sidebarAccent: "#E2E7EC", sidebarAccentForeground: "#243E58", sidebarBorder: "#DBE0E4" }),
    dark: shared({ background: "#0B1017", foreground: "#E7ECF1", card: "#111925", cardForeground: "#E7ECF1", popover: "#161F2D", popoverForeground: "#E7ECF1", primary: "#6E93BC", primaryForeground: "#0D1723", secondary: "#182333", secondaryForeground: "#D6E1EC", muted: "#161F2D", mutedForeground: "#93A3B4", accent: "#1D2A3B", accentForeground: "#BBD3E8", destructive: "#CC8488", border: "#26364A", input: "#2E4257", dataviz1: "#6E93BC", dataviz2: "#8FA9BF", dataviz3: "#B49B7A", dataviz4: "#9799BC", dataviz5: "#71A296", dataviz6: "#A6AFBA", statusCleared: "#6AA486", statusUnder: "#BFA476", statusReturned: "#C6858A", sidebar: "#0D141F", sidebarForeground: "#E7ECF1", sidebarPrimaryForeground: "#0D1723", sidebarAccent: "#192434", sidebarAccentForeground: "#BBD3E8", sidebarBorder: "#26364A" }),
  },
  {
    id: "mono", label: "Mono", description: "True grayscale UI for maximum contrast — status hints keep a faint tint.", swatch: "#3A3A3A",
    light: shared({ background: "#F5F5F5", foreground: "#141414", card: "#FFFFFF", cardForeground: "#141414", popover: "#FFFFFF", popoverForeground: "#141414", primary: "#1F1F1F", primaryForeground: "#FFFFFF", secondary: "#E8E8E8", secondaryForeground: "#242424", muted: "#ECECEC", mutedForeground: "#6B6B6B", accent: "#E2E2E2", accentForeground: "#1F1F1F", destructive: "#8A4F4F", border: "#DCDCDC", input: "#D4D4D4", dataviz1: "#1A1A1A", dataviz2: "#3D3D3D", dataviz3: "#5C5C5C", dataviz4: "#7A7A7A", dataviz5: "#9C9C9C", dataviz6: "#BEBEBE", statusCleared: "#5A7A63", statusUnder: "#8A7A55", statusReturned: "#8A5C5C", sidebar: "#EFEFEF", sidebarForeground: "#141414", sidebarPrimaryForeground: "#FFFFFF", sidebarAccent: "#E4E4E4", sidebarAccentForeground: "#1F1F1F", sidebarBorder: "#DCDCDC" }),
    dark: shared({ background: "#0A0A0A", foreground: "#F0F0F0", card: "#131313", cardForeground: "#F0F0F0", popover: "#181818", popoverForeground: "#F0F0F0", primary: "#E5E5E5", primaryForeground: "#141414", secondary: "#1E1E1E", secondaryForeground: "#E2E2E2", muted: "#1B1B1B", mutedForeground: "#A3A3A3", accent: "#252525", accentForeground: "#F0F0F0", destructive: "#C68F8F", border: "#2B2B2B", input: "#383838", dataviz1: "#F0F0F0", dataviz2: "#D0D0D0", dataviz3: "#B0B0B0", dataviz4: "#909090", dataviz5: "#707070", dataviz6: "#505050", statusCleared: "#8FA595", statusUnder: "#B5A578", statusReturned: "#B58888", sidebar: "#0D0D0D", sidebarForeground: "#F0F0F0", sidebarPrimaryForeground: "#141414", sidebarAccent: "#202020", sidebarAccentForeground: "#F0F0F0", sidebarBorder: "#2B2B2B" }),
  },
]

export const DEFAULT_PALETTE_ID = "petrol"
export const CUSTOM_PALETTE_ID = "custom"

export function getPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]
}

const STYLE_TAG_ID = "ogdcl-color-style"

function varsBlock(v: ThemeVars): string {
  const entries: [string, string][] = [
    ["--background", v.background], ["--foreground", v.foreground], ["--card", v.card], ["--card-foreground", v.cardForeground], ["--popover", v.popover], ["--popover-foreground", v.popoverForeground], ["--primary", v.primary], ["--primary-foreground", v.primaryForeground], ["--secondary", v.secondary], ["--secondary-foreground", v.secondaryForeground], ["--muted", v.muted], ["--muted-foreground", v.mutedForeground], ["--accent", v.accent], ["--accent-foreground", v.accentForeground], ["--destructive", v.destructive], ["--border", v.border], ["--input", v.input], ["--ring", v.primary], ["--sidebar-primary", v.primary], ["--sidebar-primary-foreground", v.sidebarPrimaryForeground], ["--sidebar", v.sidebar], ["--sidebar-foreground", v.sidebarForeground], ["--sidebar-accent", v.sidebarAccent], ["--sidebar-accent-foreground", v.sidebarAccentForeground], ["--sidebar-border", v.sidebarBorder], ["--sidebar-ring", v.primary], ["--chart-1", v.chart1], ["--chart-2", v.chart2], ["--chart-3", v.chart3], ["--chart-4", v.chart4], ["--chart-5", v.chart5], ["--dataviz-1", v.dataviz1], ["--dataviz-2", v.dataviz2], ["--dataviz-3", v.dataviz3], ["--dataviz-4", v.dataviz4], ["--dataviz-5", v.dataviz5], ["--dataviz-6", v.dataviz6], ["--status-cleared", v.statusCleared], ["--status-under", v.statusUnder], ["--status-returned", v.statusReturned],
  ]
  return entries.map(([key, value]) => `${key}:${value} !important;`).join("")
}

export function applyPaletteVars(light: ThemeVars, dark: ThemeVars): void {
  if (typeof document === "undefined") return
  let el = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement("style")
    el.id = STYLE_TAG_ID
    document.head.appendChild(el)
  }
  el.textContent = `:root{${varsBlock(light)}}.dark{${varsBlock(dark)}}`
}

export function applyPalette(id: string, customVars?: PaletteVars): void {
  const palette = getPalette(id === CUSTOM_PALETTE_ID ? DEFAULT_PALETTE_ID : id)
  if (id === CUSTOM_PALETTE_ID && customVars) applyPaletteVars({ ...palette.light, ...customVars }, { ...palette.dark, ...customVars })
  else applyPaletteVars(palette.light, palette.dark)
  if (typeof document !== "undefined") document.documentElement.dataset.palette = id
}


