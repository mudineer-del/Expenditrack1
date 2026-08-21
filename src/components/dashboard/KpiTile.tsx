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
  /** CSS color (e.g. "var(--chart-1)") used for the icon badge, border tint, and background wash — gives each tile its own color identity, matching VendorCard's per-vendor coloring. */
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
          : "flex flex-col gap-2.5 border-2 bg-card p-3.5 shadow-sm md:flex-row md:items-center md:gap-3.5 md:border md:p-[var(--tile-pad)]",
        onClick && "cursor-pointer transition-colors active:scale-[0.98] md:active:scale-100",
        onClick && !hero && "hover:bg-muted/50",
        onClick && hero && "hover:brightness-110 md:hover:bg-muted/50 md:hover:brightness-100"
      )}
      style={
        !hero && accent
          ? {
              backgroundImage: `linear-gradient(to bottom right, color-mix(in oklch, ${accent} 13%, var(--card)), var(--card) 65%)`,
              borderColor: `color-mix(in oklch, ${accent} 35%, var(--border))`,
            }
          : undefined
      }
      onClick={onClick}
    >
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
          <span className="hidden md:absolute md:top-0 md:left-0 md:block md:h-full md:w-1" style={{ backgroundColor: accent }} />
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
          {accent && <span className="hidden md:absolute md:top-0 md:left-0 md:block md:h-full md:w-1" style={{ backgroundColor: accent }} />}
          {/* Mobile: square-ish card — colorful icon badge on top, value +
              label stacked below. The parent grid renders these 2-per-row. */}
          <div className="flex items-center justify-between md:hidden">
            <div
              className="flex size-11 items-center justify-center rounded-xl shadow-sm [&_svg]:size-5 [&_svg]:text-white"
              style={{ backgroundColor: accent ?? "var(--primary)" }}
            >
              {icon}
            </div>
            {trend && <div style={accent ? { color: accent } : undefined}>{trend}</div>}
          </div>
          <div className="min-w-0 md:hidden">
            <div className={cn("text-2xl font-extrabold tabular-nums", valueClassName)}>{value}</div>
            <div className="mt-0.5 truncate text-[13px] font-semibold text-foreground/80">{label}</div>
            {sub && <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>}
          </div>

          {/* Desktop: unchanged compact tile */}
          <div
            className={cn(
              "hidden md:mb-1 md:flex md:size-[var(--tile-icon)] md:shrink-0 md:items-center md:justify-center md:rounded-md [&_svg]:size-[var(--tile-icon-svg)]",
              iconClassName ?? (accent ? undefined : "bg-primary/10 text-primary")
            )}
            style={accent && !iconClassName ? { backgroundColor: `color-mix(in oklch, ${accent} 16%, transparent)`, color: accent } : undefined}
          >
            {icon}
          </div>
          <div className="hidden min-w-0 md:block md:flex-none">
            <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>
            <div className={cn("text-[length:var(--tile-value)] font-semibold tabular-nums", valueClassName)}>{value}</div>
            {sub && <div className={cn("mt-0.5 text-xs text-muted-foreground", subClassName)}>{sub}</div>}
          </div>
        </>
      )}
    </div>
  )
}
