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
        // Horizontal row (icon | label+value+sub | ) below md — a bolder, more
        // deliberately "app-like" card than the desktop tile: bigger radius,
        // real shadow instead of just a border, more generous padding, and a
        // hero-sized number. Reverts to the original compact vertical tile at
        // md+. Pure breakpoint classes, no JS isMobile check, so it can't
        // desync from the actual viewport.
        "ogdcl-hoverable relative flex flex-row items-center gap-3.5 overflow-hidden rounded-2xl border bg-card p-4 pl-[1.375rem] shadow-sm md:flex-col md:items-stretch md:gap-1 md:rounded-lg md:p-[var(--tile-pad)] md:pl-[calc(var(--tile-pad)+0.375rem)] md:shadow-none",
        onClick && "cursor-pointer transition-colors hover:bg-muted/50 active:scale-[0.99] md:active:scale-100"
      )}
      style={
        accent
          ? { backgroundImage: `linear-gradient(to bottom right, color-mix(in oklch, ${accent} 7%, var(--card)), var(--card) 70%)` }
          : undefined
      }
      onClick={onClick}
    >
      {accent && <span className="absolute top-0 left-0 h-full w-1.5 md:w-1" style={{ backgroundColor: accent }} />}
      {trend && (
        <div className="hidden md:block md:absolute md:top-[var(--tile-pad)] md:right-[var(--tile-pad)]" style={accent ? { color: accent } : undefined}>
          {trend}
        </div>
      )}
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5 md:mb-1 md:size-[var(--tile-icon)] md:rounded-md md:[&_svg]:size-[var(--tile-icon-svg)]",
          iconClassName ?? (accent ? undefined : "bg-primary/10 text-primary")
        )}
        style={accent && !iconClassName ? { backgroundColor: `color-mix(in oklch, ${accent} 16%, transparent)`, color: accent } : undefined}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 md:flex-none">
        <div className="flex items-baseline justify-between gap-2 md:block">
          <span className="min-w-0 truncate text-[13px] text-muted-foreground md:text-xs">{label}</span>
          <span className={cn("shrink-0 text-xl font-bold tabular-nums md:hidden", valueClassName)}>{value}</span>
        </div>
        <div className={cn("hidden text-[length:var(--tile-value)] font-semibold tabular-nums md:block", valueClassName)}>{value}</div>
        {sub && <div className={cn("mt-0.5 text-[13px] text-muted-foreground md:mt-0 md:text-xs", subClassName)}>{sub}</div>}
      </div>
    </div>
  )
}
