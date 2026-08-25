export interface ChipColor {
  from: string
  to: string
  shadow: string
}

/**
 * Fixed per-item identity colors for the sidebar's nav icon chips — deliberately
 * theme-independent (same hues in light/dark and across every color palette) since
 * these are semantic category colors ("Invoices is amber"), not theme accents.
 * Keyed by route path to match NAV_GROUPS in AppSidebar.tsx.
 */
export const NAV_ITEM_COLORS: Record<string, ChipColor> = {
  "/": { from: "#4FA3DE", to: "#1C6FB8", shadow: "rgba(28,111,184,0.5)" },
  "/invoices": { from: "#E8A94F", to: "#B4720A", shadow: "rgba(180,114,10,0.42)" },
  "/vendors": { from: "#A97BF2", to: "#7C3AED", shadow: "rgba(124,58,237,0.42)" },
  "/reports": { from: "#4DC4B5", to: "#0D9488", shadow: "rgba(13,148,136,0.42)" },
  "/messages": { from: "#E8659B", to: "#BE185D", shadow: "rgba(190,24,93,0.42)" },
  "/activity": { from: "#7B8CA3", to: "#475569", shadow: "rgba(71,85,105,0.4)" },
  "/users": { from: "#8983F0", to: "#4F46E5", shadow: "rgba(79,70,229,0.42)" },
  "/install": { from: "#4FCB9C", to: "#059669", shadow: "rgba(5,150,105,0.42)" },
  "/settings": { from: "#8B857C", to: "#57534E", shadow: "rgba(87,83,78,0.4)" },
}

/** "All departments" reuses the Dashboard blue — it's the same "everything" idea. */
export const ALL_DEPARTMENTS_COLOR: ChipColor = NAV_ITEM_COLORS["/"]

/** Department names are admin-defined free text, so colors are assigned by a stable
 *  hash into this palette rather than hardcoded per name. */
const DEPARTMENT_PALETTE: ChipColor[] = [
  { from: "#4DBFDA", to: "#0E7C9C", shadow: "rgba(14,124,156,0.42)" },
  { from: "#E8935A", to: "#B4570A", shadow: "rgba(180,87,10,0.42)" },
  { from: "#C7A363", to: "#8A6A2E", shadow: "rgba(138,106,46,0.42)" },
  { from: "#CE87D6", to: "#9A3FA0", shadow: "rgba(154,63,160,0.4)" },
  { from: "#6FBF87", to: "#2F8F52", shadow: "rgba(47,143,82,0.4)" },
  { from: "#8983F0", to: "#4F46E5", shadow: "rgba(79,70,229,0.42)" },
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function departmentChipColor(name: string): ChipColor {
  return DEPARTMENT_PALETTE[hashString(name) % DEPARTMENT_PALETTE.length]
}
