import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function KpiTile({
  icon,
  iconClassName,
  accent,
  label,
  value,
  valueClassName,
  sub,
  subClassName,
  trend,
  onClick,
}: {
  icon: ReactNode
  iconClassName?: string
  /** CSS color (e.g. "var(--chart-1)") used for the left accent bar, icon tint, and a faint background wash — gives each tile its own color identity, matching VendorCard's per-vendor coloring. */
  accent?: string
  label: string
  value: ReactNode
  valueClassName?: string
  sub?: ReactNode
  subClassName?: string
  /** Optional sparkline (or any small element) pinned to the top-right corner, opposite the icon. */
  trend?: ReactNode
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        "ogdcl-hoverable relative flex flex-col gap-1 overflow-hidden rounded-lg border bg-card p-[var(--tile-pad)] pl-[calc(var(--tile-pad)+0.375rem)]",
        onClick && "cursor-pointer transition-colors hover:bg-muted/50"
      )}
      style={
        accent
          ? { backgroundImage: `linear-gradient(to bottom right, color-mix(in oklch, ${accent} 7%, var(--card)), var(--card) 70%)` }
          : undefined
      }
      onClick={onClick}
    >
      {accent && <span className="absolute top-0 left-0 h-full w-1" style={{ backgroundColor: accent }} />}
      {trend && <div className="absolute top-[var(--tile-pad)] right-[var(--tile-pad)]" style={accent ? { color: accent } : undefined}>{trend}</div>}
      <div
        className={cn(
          "mb-1 flex size-[var(--tile-icon)] items-center justify-center rounded-md [&_svg]:size-[var(--tile-icon-svg)]",
          iconClassName ?? (accent ? undefined : "bg-primary/10 text-primary")
        )}
        style={accent && !iconClassName ? { backgroundColor: `color-mix(in oklch, ${accent} 16%, transparent)`, color: accent } : undefined}
      >
        {icon}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-[length:var(--tile-value)] font-semibold tabular-nums", valueClassName)}>{value}</div>
      {sub && <div className={cn("text-xs text-muted-foreground", subClassName)}>{sub}</div>}
    </div>
  )
}
