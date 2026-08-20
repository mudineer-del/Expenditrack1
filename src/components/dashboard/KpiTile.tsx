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
  hero,
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
  /** Mobile-only "headline" treatment — dark navy card with an oversized
   *  number and the trend sparkline embedded as its own row instead of
   *  tucked in a corner. Identical to a normal tile at md+; reserve for the
   *  1-2 metrics that should read as the page's primary numbers. */
  hero?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        "ogdcl-hoverable relative overflow-hidden rounded-2xl md:flex md:flex-col md:items-stretch md:gap-1 md:rounded-lg md:border md:bg-card md:p-[var(--tile-pad)] md:pl-[calc(var(--tile-pad)+0.375rem)] md:shadow-none",
        hero
          ? "bg-[var(--ogdcl-navy)] p-5 text-white shadow-lg md:text-foreground"
          : "flex flex-row items-center gap-3.5 border bg-card p-4 pl-[1.375rem] shadow-sm",
        onClick && "cursor-pointer transition-colors active:scale-[0.99] md:active:scale-100",
        onClick && !hero && "hover:bg-muted/50",
        onClick && hero && "hover:brightness-110 md:hover:bg-muted/50 md:hover:brightness-100"
      )}
      style={
        !hero && accent
          ? { backgroundImage: `linear-gradient(to bottom right, color-mix(in oklch, ${accent} 7%, var(--card)), var(--card) 70%)` }
          : undefined
      }
      onClick={onClick}
    >
      {accent && !hero && <span className="absolute top-0 left-0 h-full w-1.5 md:w-1" style={{ backgroundColor: accent }} />}
      {trend && (
        <div className="hidden md:block md:absolute md:top-[var(--tile-pad)] md:right-[var(--tile-pad)]" style={!hero && accent ? { color: accent } : undefined}>
          {trend}
        </div>
      )}

      {hero ? (
        <>
          {/* Mobile hero card */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 [&_svg]:size-[18px]">{icon}</div>
            <span className="truncate text-[13px] text-white/60">{label}</span>
          </div>
          <div className={cn("mt-3 text-3xl font-extrabold tabular-nums md:hidden", valueClassName)}>{value}</div>
          {sub && <div className="mt-1 text-[13px] text-white/70 md:hidden">{sub}</div>}
          {trend && (
            <div className="-mx-1 mt-4 md:hidden" style={{ color: "var(--ogdcl-green, #5BC49A)" }}>
              {trend}
            </div>
          )}
          {/* Desktop — identical structure/markup to the non-hero tile below */}
          <div
            className={cn(
              "hidden size-[var(--tile-icon)] shrink-0 items-center justify-center rounded-md md:mb-1 md:flex [&_svg]:size-[var(--tile-icon-svg)]",
              iconClassName ?? (accent ? undefined : "bg-primary/10 text-primary")
            )}
            style={accent && !iconClassName ? { backgroundColor: `color-mix(in oklch, ${accent} 16%, transparent)`, color: accent } : undefined}
          >
            {icon}
          </div>
          <div className="hidden text-xs text-muted-foreground md:block">{label}</div>
          <div className={cn("hidden text-[length:var(--tile-value)] font-semibold tabular-nums md:block", valueClassName)}>{value}</div>
          {sub && <div className={cn("hidden text-xs text-muted-foreground md:block", subClassName)}>{sub}</div>}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
}
