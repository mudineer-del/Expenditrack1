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
        "group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-sm transition-shadow duration-200 ease-out md:p-5",
        "hover:shadow-md",
        "transition-transform active:scale-[0.99] active:duration-100 active:ease-in md:active:scale-[0.995]"
      )}
      style={
        {
          borderColor: `color-mix(in oklch, ${accent} 22%, var(--border))`,
          ...accentBackgroundStyle(accent, chartBackground, chartBackgroundDirection),
          "--accent-shadow": `color-mix(in oklch, ${accent} 25%, var(--border))`,
          "--accent-glow": `color-mix(in oklch, ${accent} 35%, transparent)`,
        } as React.CSSProperties
      }
    >
      <span
        className="absolute top-0 left-0 h-full w-1 opacity-70 transition-opacity duration-300 group-hover:opacity-100 md:top-0 md:h-1 md:w-full"
        style={{ backgroundColor: accent }}
      />
      <div className="mb-2 flex items-center justify-between gap-2 md:mb-3">
        <span className="text-xs font-medium text-muted-foreground md:text-sm md:font-semibold md:text-foreground">{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}
