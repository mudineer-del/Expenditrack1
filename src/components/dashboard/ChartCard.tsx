import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useDisplayStore, type ChartBackground, type ChartBackgroundDirection } from "@/store/useDisplayStore"

/** Settings ▸ Format ▸ Charts ▸ "Chart background" controls this — from a plain solid
 *  card ("flat", Office's "No fill") up through today's soft accent wash ("subtle") to a
 *  bolder sweep ("gradient"), in any of the direction presets Office's own gradient-fill
 *  picker offers. `direction` is ignored once level is "flat" (nothing to point). */
export function accentBackgroundStyle(accent: string, level: ChartBackground, direction: ChartBackgroundDirection): React.CSSProperties {
  if (level === "flat") return {}
  const tintPct = level === "gradient" ? 20 : 7
  const cardStopPct = level === "gradient" ? 88 : 62
  const from = `color-mix(in oklch, ${accent} ${tintPct}%, var(--card))`
  if (direction === "radial") {
    return { backgroundImage: `radial-gradient(120% 120% at 12% 10%, ${from} 0%, var(--card) ${cardStopPct}%)` }
  }
  const angle = direction === "vertical" ? 180 : direction === "horizontal" ? 100 : 155
  return { backgroundImage: `linear-gradient(${angle}deg, ${from} 0%, var(--card) ${cardStopPct}%)` }
}

/** Each chart card gets its own color identity (drawn from the warm --dataviz palette)
 *  instead of every card sharing one flat --primary blue — otherwise several differently
 *  titled cards read as one indistinguishable block. Shared by DashboardPage and any other
 *  page that wants the same chart-card chrome (e.g. VendorDetailSheet). */
export function ChartCard({
  accent,
  title,
  action,
  children,
}: {
  accent: string
  title: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  const chartBackground = useDisplayStore((s) => s.chartBackground)
  const chartBackgroundDirection = useDisplayStore((s) => s.chartBackgroundDirection)

  return (
    <div
      className={cn(
        // No hover transform on this element: it wraps a Recharts chart whose slices/bars
        // need pixel-precise hover tracking under the cursor. A geometry-shifting hover
        // transform (translate/rotate) here transitions the content out from under an
        // already-hovering pointer mid-gesture, which silently breaks the chart's own
        // hover/tap popup — depth is conveyed with shadow alone instead, which never
        // moves anything. Only :active gets a (tiny, safe) scale, and only after the
        // click has already been resolved against the pre-press geometry.
        "dashboard-chart-card group relative overflow-hidden rounded-[1.35rem] border bg-card shadow-[0_12px_35px_-24px_rgba(15,23,42,0.48)] transition-[box-shadow,border-color] duration-300 ease-out",
        "hover:shadow-[0_20px_45px_-26px_var(--accent-glow)]",
        "transition-transform active:scale-[0.99] active:duration-100 active:ease-in md:active:scale-[0.995]"
      )}
      style={
        {
          borderColor: `color-mix(in oklch, ${accent} 30%, var(--border))`,
          "--accent-shadow": `color-mix(in oklch, ${accent} 25%, var(--border))`,
          "--accent-glow": `color-mix(in oklch, ${accent} 35%, transparent)`,
          "--chart-accent": accent,
        } as React.CSSProperties
      }
    >
      {/* Distinct, prominent title bar — tinted from this card's own accent so every
          card reads as its own clearly-bounded "window" rather than a title floating
          on the same flat surface as the chart. Buttons rendered into `action` (the
          zoom stepper, data/visibility/type menus) inherit --chart-accent from here
          for their own hover/press color via .chart-toolbar-btn in index.css. */}
      <div className="chart-card-titlebar relative flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="chart-card-accent-chip" />
          <span className="min-w-0 truncate text-[clamp(0.86rem,0.78rem+0.24vw,1.02rem)] font-bold leading-tight tracking-[-0.01em] text-foreground">
            {title}
          </span>
        </div>
        {action && <div className="flex shrink-0 items-center gap-1">{action}</div>}
      </div>
      <div className="relative p-4 md:p-5">
        <span className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full opacity-[0.07] blur-2xl" style={{ backgroundColor: accent }} />
        <div className="relative min-w-0" style={accentBackgroundStyle(accent, chartBackground, chartBackgroundDirection)}>
          {children}
        </div>
      </div>
    </div>
  )
}
