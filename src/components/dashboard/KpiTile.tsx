import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** The sidebar's gradient icon-chip formula (linear-gradient light→base + tinted shadow),
 *  generalized via color-mix so it works with any accent — a literal hex or a CSS var. */
function chipStyle(accent: string): React.CSSProperties {
  return {
    background: `linear-gradient(155deg, color-mix(in oklch, ${accent} 45%, white), ${accent})`,
    boxShadow: `0 3px 8px -2px color-mix(in oklch, ${accent} 45%, transparent)`,
  }
}

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
  /** CSS color (e.g. "var(--chart-1)") used for the icon badge, border tint, and background wash — gives each tile its own color identity, matching VendorCard's per-vendor coloring. */
  accent?: string
  label: string
  value: ReactNode
  valueClassName?: string
  sub?: ReactNode
  subClassName?: string
  /** Optional sparkline (or any small element) pinned to the top-right corner, opposite the icon. */
  trend?: ReactNode
  /** "Headline" treatment — an oversized number on mobile with the trend
   *  sparkline embedded as its own row instead of tucked in a corner.
   *  Identical to a normal tile at md+; reserve for the 1-2 metrics that
   *  should read as the page's primary numbers. Previously rendered as a
   *  dark navy card on mobile — that read as two oddly dark, disconnected
   *  cards sitting in an otherwise light, colorful grid, so hero now uses
   *  the same light/accent-tinted styling as every other tile and only
   *  keeps its own layout (bigger number, full-width trend row). */
  hero?: boolean
  onClick?: () => void
}) {
  return (
    <div
      className={cn(
        "ogdcl-hoverable relative transform-gpu overflow-hidden rounded-2xl border-2 bg-card shadow-sm transition-all duration-300 ease-out md:flex md:flex-col md:items-stretch md:gap-1 md:rounded-2xl md:border md:bg-card md:p-[var(--tile-pad)] md:pl-[calc(var(--tile-pad)+0.375rem)] md:shadow-[0_7px_0_var(--kpi-shadow),0_16px_24px_-18px_var(--kpi-glow)] md:will-change-transform",
        hero ? "p-4" : "flex flex-col gap-2.5 p-3.5 md:flex-row md:items-center md:gap-3.5",
        onClick && "cursor-pointer active:scale-[0.98] active:duration-100 md:active:scale-100",
        onClick &&
          "hover:-translate-y-1 hover:bg-muted/50 hover:shadow-lg md:hover:-translate-y-1 md:hover:bg-card md:hover:shadow-[0_10px_0_var(--kpi-shadow),0_24px_34px_-18px_var(--kpi-glow)]"
      )}
      style={
        accent
          ? ({
              backgroundImage: `linear-gradient(145deg, color-mix(in oklch, ${accent} 7%, var(--card)), var(--card) 68%)`,
              borderColor: `color-mix(in oklch, ${accent} 18%, var(--border))`,
              "--kpi-shadow": `color-mix(in oklch, ${accent} 22%, var(--border))`,
              "--kpi-glow": `color-mix(in oklch, ${accent} 34%, transparent)`,
            } as React.CSSProperties)
          : undefined
      }
      onClick={onClick}
    >
      {/* Desktop keeps KPI cards clean and typographic; trend visuals remain available
          in the mobile treatment where they do not compete with the value hierarchy. */}

      {hero ? (
        <>
          {/* Mobile hero card */}
          <div className="flex items-center gap-2 md:hidden">
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px] [&_svg]:text-white"
              style={chipStyle(accent ?? "var(--primary)")}
            >
              {icon}
            </div>
            <span className="truncate text-[13px] font-semibold text-foreground/80">{label}</span>
          </div>
          <div className={cn("mt-3 truncate text-2xl font-extrabold tabular-nums md:hidden", valueClassName)}>{value}</div>
          {sub && <div className="mt-1 truncate text-[13px] text-muted-foreground md:hidden">{sub}</div>}
          {trend && (
            <div className="-mx-1 mt-4 md:hidden" style={accent ? { color: accent } : undefined}>
              {trend}
            </div>
          )}
          {/* Desktop — identical structure/markup to the non-hero tile below */}
          <span className="hidden md:absolute md:top-0 md:left-0 md:block md:h-full md:w-1" style={{ backgroundColor: accent }} />
          <div
            className={cn(
              "hidden size-[var(--tile-icon)] shrink-0 items-center justify-center rounded-md md:mb-1 md:flex [&_svg]:size-[var(--tile-icon-svg)]",
              iconClassName ?? (accent ? "[&_svg]:text-white" : "bg-primary/10 text-primary")
            )}
            style={accent && !iconClassName ? chipStyle(accent) : undefined}
          >
            {icon}
          </div>
          <div className="hidden text-xs text-muted-foreground md:block">{label}</div>
          <div className={cn("hidden truncate text-[length:var(--tile-value)] font-semibold tabular-nums md:block", valueClassName)}>{value}</div>
          {sub && <div className={cn("hidden text-xs text-muted-foreground md:block", subClassName)}>{sub}</div>}
        </>
      ) : (
        <>
          {accent && <span className="hidden md:absolute md:top-0 md:left-0 md:block md:h-full md:w-1" style={{ backgroundColor: accent }} />}
          {/* Mobile: square-ish card — colorful icon badge on top, value +
              label stacked below. The parent grid renders these 2-per-row. */}
          <div className="flex items-center justify-between md:hidden">
            <div
              className="flex size-11 items-center justify-center rounded-xl [&_svg]:size-5 [&_svg]:text-white"
              style={chipStyle(accent ?? "var(--primary)")}
            >
              {icon}
            </div>
            {trend && <div style={accent ? { color: accent } : undefined}>{trend}</div>}
          </div>
          <div className="min-w-0 md:hidden">
            <div className={cn("truncate text-xl font-extrabold tabular-nums", valueClassName)}>{value}</div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-foreground/80">{label}</div>
            {sub && <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>}
          </div>

          {/* Desktop: unchanged compact tile */}
          <div
            className={cn(
              "hidden md:mb-1 md:flex md:size-[var(--tile-icon)] md:shrink-0 md:items-center md:justify-center md:rounded-md [&_svg]:size-[var(--tile-icon-svg)]",
              iconClassName ?? (accent ? "[&_svg]:text-white" : "bg-primary/10 text-primary")
            )}
            style={accent && !iconClassName ? chipStyle(accent) : undefined}
          >
            {icon}
          </div>
          <div className="hidden min-w-0 md:block md:flex-none">
            <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>
            <div className={cn("truncate text-[length:var(--tile-value)] font-semibold tabular-nums", valueClassName)}>{value}</div>
            {sub && <div className={cn("mt-0.5 text-xs text-muted-foreground", subClassName)}>{sub}</div>}
          </div>
        </>
      )}
    </div>
  )
}
