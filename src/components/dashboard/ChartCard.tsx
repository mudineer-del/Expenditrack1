import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

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
          backgroundImage: `linear-gradient(155deg, color-mix(in oklch, ${accent} 7%, var(--card)) 0%, var(--card) 62%)`,
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
