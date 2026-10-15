import type { CSSProperties, ComponentType } from "react"
import type { ChipColor } from "@/lib/navColors"
import { useSidebarPrefsStore } from "@/store/useSidebarPrefsStore"

/** Glyph size for a sidebar pill icon, from Settings > Labels > Sidebar Customization's icon
 *  size. Compact rows scale that size down proportionally. */
export function sidebarGlyphSize(iconSize: number, compact: boolean): number {
  return compact ? Math.round((iconSize * 16) / 19) : iconSize
}

/** A small gradient-filled icon badge used by the sidebar's nav rows and department
 *  switcher — see [[NAV_ITEM_COLORS]] / [[departmentChipColor]] in lib/navColors.ts. */
export function NavIconChip({
  icon: Icon,
  color,
  compact = false,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  color: ChipColor
  compact?: boolean
}) {
  const iconSize = useSidebarPrefsStore((s) => s.iconSize)
  const imageIcon = (Icon as ComponentType & { isImageIcon?: boolean }).isImageIcon
  const glyph = sidebarGlyphSize(iconSize, compact)
  const box = glyph + (compact ? 6 : 7)
  return (
    <div
      className={compact ? "flex shrink-0 items-center justify-center rounded-[7px] border border-white/15 text-white" : "flex shrink-0 items-center justify-center rounded-[8px] text-white"}
      style={{
        width: box,
        height: box,
        background: imageIcon ? "color-mix(in oklch, var(--card) 92%, white)" : `linear-gradient(155deg, ${color.from}, ${color.to})`,
        boxShadow: imageIcon ? "inset 0 1px 0 rgba(255,255,255,.9), 0 3px 8px -2px rgba(15,23,42,.22)" : `inset 0 1px 0 rgba(255,255,255,.24), 0 3px 8px -2px ${color.shadow}`,
      }}
    >
      <Icon className={compact ? "stroke-[2.2]" : undefined} style={{ width: glyph, height: glyph }} />
    </div>
  )
}
