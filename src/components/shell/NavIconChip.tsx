import type { ChipColor } from "@/lib/navColors"

/** A small gradient-filled icon badge used by the sidebar's nav rows and department
 *  switcher — see [[NAV_ITEM_COLORS]] / [[departmentChipColor]] in lib/navColors.ts. */
export function NavIconChip({
  icon: Icon,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  color: ChipColor
}) {
  return (
    <div
      className="flex size-[26px] shrink-0 items-center justify-center rounded-[8px] text-white"
      style={{ background: `linear-gradient(155deg, ${color.from}, ${color.to})`, boxShadow: `0 3px 8px -2px ${color.shadow}` }}
    >
      <Icon className="size-[15px]!" />
    </div>
  )
}
