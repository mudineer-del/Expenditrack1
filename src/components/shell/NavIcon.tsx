import type { CSSProperties, ComponentType } from "react"
import { NavIconChip } from "@/components/shell/NavIconChip"
import type { ChipColor } from "@/lib/navColors"

/** Flat sidebar nav glyph — the alternative to NavIconChip's gradient badge, picked
 *  via Settings > Labels > Sidebar Customization > Icon style. Plain icon tinted in
 *  its item's accent color; leaves color unset when `active` so it inherits the
 *  white/primary-foreground the active row's own background rule already forces. */
export function NavIcon({
  icon: Icon,
  color,
  compact = false,
  active = false,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  color: ChipColor
  compact?: boolean
  active?: boolean
}) {
  // The `!` important-modifier matches NavIconChip's own convention — SidebarMenuSubButton
  // and friends ship their own `[&_svg]:size-4` defaults at equal specificity, so an
  // unmodified size utility here isn't guaranteed to win the cascade.
  return <Icon className={compact ? "size-4! shrink-0" : "size-[18px]! shrink-0"} style={active ? undefined : { color: color.to }} />
}

/** Renders either NavIconChip's gradient badge or NavIcon's flat glyph depending on
 *  Settings > Labels > Sidebar Customization's icon-style pref — the one switch
 *  every sidebar nav row (AppSidebar, DepartmentSwitcher) renders its icon through. */
export function SidebarIcon({
  icon,
  color,
  compact,
  active,
  flat,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  color: ChipColor
  compact?: boolean
  active?: boolean
  flat: boolean
}) {
  return flat ? (
    <NavIcon icon={icon} color={color} compact={compact} active={active} />
  ) : (
    <NavIconChip icon={icon} color={color} compact={compact} />
  )
}
