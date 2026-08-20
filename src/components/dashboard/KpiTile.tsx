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
        // Horizontal row (icon | label+value+sub | ) below md — reads as a clean
        // list row like the mobile design's summary cards. Reverts to the
        // original vertical tile at md+. Pure breakpoint classes, no JS
        // isMobile check, so it can't desync from the actual viewport.
        "ogdcl-hoverable relative flex flex-row items-center gap-3 overflow-hidden rounded-lg border bg-card p-[var(--tile-pad)] pl-[calc(var(--tile-pad)+0.375rem)] md:flex-col md:items-stretch md:gap-1",
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
      {trend && (
        <div className="hidden md:block md:absolute md:top-[var(--tile-pad)] md:right-[var(--tile-pad)]" style={accent ? { color: accent } : undefined}>
          {trend}
        </div>
      )}
      <div
        className={cn(
          "flex size-[var(--tile-icon)] shrink-0 items-center justify-center rounded-md [&_svg]:size-[var(--tile-icon-svg)] md:mb-1",
          iconClassName ?? (accent ? undefined : "bg-primary/10 text-primary")
        )}
        style={accent && !iconClassName ? { backgroundColor: `color-mix(in oklch, ${accent} 16%, transparent)`, color: accent } : undefined}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 md:flex-none">
        <div className="flex items-baseline justify-between gap-2 md:block">
          <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>
          <span className={cn("shrink-0 text-[length:var(--tile-value)] font-semibold tabular-nums md:hidden", valueClassName)}>{value}</span>
        </div>
        <div className={cn("hidden text-[length:var(--tile-value)] font-semibold tabular-nums md:block", valueClassName)}>{value}</div>
        {sub && <div className={cn("mt-0.5 text-xs text-muted-foreground md:mt-0", subClassName)}>{sub}</div>}
      </div>
    </div>
  )
}
