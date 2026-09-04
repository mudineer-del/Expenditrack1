import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic"
import type { ComponentType, CSSProperties } from "react"
import { imgIcon } from "@/components/shell/NavIcon"
import { ICONS_3D_BY_ID } from "@/lib/iconLibrary3d"
import type { IconRef } from "@/store/useSidebarPrefsStore"

const LUCIDE_NAME_SET = new Set<string>(iconNames)

/** Wraps lucide-react's DynamicIcon (lazy-loads the one named icon's own tiny chunk,
 *  not the whole ~1500-icon library) into the same icon-component shape NavIconChip/
 *  NavIcon/SidebarIcon already expect — same idea as imgIcon in NavIcon.tsx, for the
 *  "picked a lucide icon by name from the picker" case instead of a static image. */
function lucideIcon(name: IconName) {
  return function LucideDynamicIcon({ className, style }: { className?: string; style?: CSSProperties }) {
    return <DynamicIcon name={name} className={className} style={style} />
  }
}

/** The one place a per-slot icon override (Settings → Labels → Sidebar Customization)
 *  gets turned into an actual renderable icon component — falls back to `fallback`
 *  (the item's normal default icon) if there's no override for `key`, or if a saved
 *  name/id no longer exists in the current library. */
export function resolveIcon(
  key: string,
  fallback: ComponentType<{ className?: string; style?: CSSProperties }>,
  overrides: Record<string, IconRef>
): ComponentType<{ className?: string; style?: CSSProperties }> {
  const ref = overrides[key]
  if (!ref) return fallback
  if (ref.kind === "lucide") return LUCIDE_NAME_SET.has(ref.name) ? lucideIcon(ref.name as IconName) : fallback
  const icon3d = ICONS_3D_BY_ID[ref.id]
  return icon3d ? imgIcon(icon3d.src) : fallback
}
