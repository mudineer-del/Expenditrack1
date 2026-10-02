import type { ChipColor } from "@/lib/navColors"

/** A small gradient-filled icon badge used by the sidebar's nav rows and department
 *  switcher — see [[NAV_ITEM_COLORS]] / [[departmentChipColor]] in lib/navColors.ts. */
export function NavIconChip({
  icon: Icon,
  color,
  compact = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: ChipColor
  compact?: boolean
}) {
  const imageIcon = (Icon as React.ComponentType & { isImageIcon?: boolean }).isImageIcon
  return (
    <div
      className={compact ? "flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border border-white/15 text-white" : "flex size-[26px] shrink-0 items-center justify-center rounded-[8px] text-white"}
      style={{
        background: imageIcon ? "color-mix(in oklch, var(--card) 92%, white)" : `linear-gradient(155deg, ${color.from}, ${color.to})`,
        boxShadow: imageIcon ? "inset 0 1px 0 rgba(255,255,255,.9), 0 3px 8px -2px rgba(15,23,42,.22)" : `inset 0 1px 0 rgba(255,255,255,.24), 0 3px 8px -2px ${color.shadow}`,
      }}
    >
      <Icon className={compact ? "size-[16px]! stroke-[2.2]" : "size-[19px]!"} />
    </div>
  )
}
