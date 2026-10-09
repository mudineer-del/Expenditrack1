import type { ReactNode } from "react"
import { useState } from "react"
import { Maximize2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useDisplayStore, type ChartBackground, type ChartBackgroundDirection, type ChartSlotId, type ChartDimension, type ChartMeasure } from "@/store/useDisplayStore"

// The maximize window has its own presentation scale. It must not inherit the
// chart card's zoom, so every chart opens consistently at the same readable size.
const MAXIMIZED_CHART_DEFAULT_ZOOM = 0.8

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
  id,
  accent,
  title,
  action,
  children,
  period,
}: {
  /** Chart slot this card belongs to — reads a per-chart accentColor override from
   *  Settings when set (see ChartFormatMenu's "Background colour" picker). Omit for a
   *  card with no per-slot config (e.g. a one-off chart nothing else customizes). */
  id?: ChartSlotId
  accent: string
  title: ReactNode
  action?: ReactNode
  children: ReactNode
  period?: string
}) {
  const chartBackground = useDisplayStore((s) => s.chartBackground)
  const chartBackgroundDirection = useDisplayStore((s) => s.chartBackgroundDirection)
  const accentOverride = useDisplayStore((s) => (id ? s.chartSlots[id]?.accentColor : undefined))
  const setChartSlot = useDisplayStore((s) => s.setChartSlot)
  const setChartType = useDisplayStore((s) => s.setChartType)
  const effectiveAccent = accentOverride || accent
  const [isMaximized, setIsMaximized] = useState(false)
  const [showLabels, setShowLabels] = useState(true)
  const [showLegend, setShowLegend] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showAxes, setShowAxes] = useState(true)
  const [popupZoom, setPopupZoom] = useState(MAXIMIZED_CHART_DEFAULT_ZOOM)

  return (
    <>
    <div
      className={cn(
        // No hover transform on this element: it wraps a Recharts chart whose slices/bars
        // need pixel-precise hover tracking under the cursor. A geometry-shifting hover
        // transform (translate/rotate) here transitions the content out from under an
        // already-hovering pointer mid-gesture, which silently breaks the chart's own
        // hover/tap popup — depth is conveyed with shadow alone instead, which never
        // moves anything. Only :active gets a (tiny, safe) scale, and only after the
        // click has already been resolved against the pre-press geometry.
        //
        // min-w-0 matters as much as overflow-hidden here: a grid/flex item's default
        // min-width is `auto` (its content's own min-content size), so without this a
        // donut chart's outer labels (raw SVG coordinates with no clamp against the
        // available width — see donut3d.tsx's DonutOuterLabel) can force this card, and
        // the whole row/dialog around it, wider than its own column instead of just
        // getting clipped — the actual bug behind charts visibly bleeding past a dialog's
        // edge in InvoiceDetailSheet/VendorDetailSheet/ContractDetailSheet.
        "dashboard-chart-card group relative min-w-0 overflow-hidden rounded-[1.35rem] border bg-card shadow-[0_12px_35px_-24px_rgba(15,23,42,0.48)] transition-[box-shadow,border-color] duration-300 ease-out cursor-pointer",
        "hover:shadow-[0_20px_45px_-26px_var(--accent-glow)]",
        "transition-transform active:scale-[0.99] active:duration-100 active:ease-in md:active:scale-[0.995]"
      )}
      style={
        {
          borderColor: `color-mix(in oklch, ${effectiveAccent} 30%, var(--border))`,
          "--accent-shadow": `color-mix(in oklch, ${effectiveAccent} 25%, var(--border))`,
          "--accent-glow": `color-mix(in oklch, ${effectiveAccent} 35%, transparent)`,
          "--chart-accent": effectiveAccent,
        } as React.CSSProperties
      }
      onDoubleClick={() => setIsMaximized(true)}
      title="Double-click to maximize"
    >
      {/* Distinct, prominent title bar — tinted from this card's own accent so every
          card reads as its own clearly-bounded "window" rather than a title floating
          on the same flat surface as the chart. Buttons rendered into `action` (the
          zoom stepper, data/visibility/type menus) inherit --chart-accent from here
          for their own hover/press color via .chart-toolbar-btn in index.css. */}
      <div className="chart-card-titlebar relative flex min-h-11 flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="chart-card-accent-chip" />
          <span className="min-w-0 truncate text-[clamp(0.86rem,0.78rem+0.24vw,1.02rem)] font-bold leading-tight tracking-[-0.01em] text-foreground">
            {title}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action && <>{action}</>}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.stopPropagation()
              setIsMaximized(true)
            }}
            title="Maximize chart (or double-click)"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="relative p-4 md:p-5">
        <span className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full opacity-[0.07] blur-2xl" style={{ backgroundColor: effectiveAccent }} />
        <div className="relative min-w-0" style={accentBackgroundStyle(effectiveAccent, chartBackground, chartBackgroundDirection)}>
          {children}
        </div>
      </div>
    </div>

    <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
      <DialogContent
        className="h-screen max-h-screen w-screen max-w-none border-0 p-0 flex flex-col gap-0"
        style={{ width: "calc(100vw - 2rem)", height: "calc(100dvh - 2rem)", maxWidth: "none", maxHeight: "none" }}
      >
        <div className="flex flex-col h-full bg-background">
          {/* Header */}
          <div className="flex min-h-12 items-center justify-between border-b px-6 py-2.5" style={{ borderColor: `color-mix(in oklch, ${effectiveAccent} 20%, var(--border))` }}>
            <div className="flex items-center gap-3">
              <span className="h-3 w-1 rounded-full" style={{ backgroundColor: effectiveAccent }} />
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-bold text-foreground">{title}</span>
                {period && <span className="text-[11px] text-muted-foreground">{period}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setIsMaximized(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex min-h-12 flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-2">
            <select className="h-7 rounded-md border bg-background px-2 text-xs" aria-label="Chart type" defaultValue="" onChange={(e) => {
              if (!id) return
              const chartTypeMap: Record<string, string> = {
                dashTrend: "trendChartType",
                dashService: "serviceChartType",
                dashVendor: "vendorChartType",
                dashBreakdown: "breakdownChartType",
                dashStatus: "statusChartType",
              }
              const chartType = chartTypeMap[id] as any
              if (chartType) setChartType(chartType, e.target.value as any)
            }}><option value="" disabled>Chart type</option><option value="bar">Column / Bar</option><option value="line">Line</option><option value="area">Area</option><option value="pie">Pie</option><option value="radar">Radar</option><option value="scatter">Scatter</option></select>
            <select className="h-7 rounded-md border bg-background px-2 text-xs" aria-label="Chart dimension" defaultValue="" onChange={(e) => id && setChartSlot(id, { dimension: e.target.value as ChartDimension })}><option value="" disabled>Dimension</option><option value="month">Month</option><option value="well">Well</option><option value="vendor">Vendor</option><option value="service">Service</option><option value="quarter">Quarter</option></select>
            <select className="h-7 rounded-md border bg-background px-2 text-xs" aria-label="Chart measure" defaultValue="" onChange={(e) => id && setChartSlot(id, { measure: e.target.value as ChartMeasure })}><option value="" disabled>Measure</option><option value="incl">Amount incl. tax</option><option value="count">Invoice count</option><option value="paid">Amount paid</option></select>
            <Button size="sm" variant={showLabels ? "secondary" : "outline"} className="h-7 px-2 text-xs" onClick={() => setShowLabels((v) => !v)}>Data labels</Button>
            <Button size="sm" variant={showLegend ? "secondary" : "outline"} className="h-7 px-2 text-xs" onClick={() => setShowLegend((v) => !v)}>Legend</Button>
            <Button size="sm" variant={showGrid ? "secondary" : "outline"} className="h-7 px-2 text-xs" onClick={() => setShowGrid((v) => !v)}>Gridlines</Button>
            <Button size="sm" variant={showAxes ? "secondary" : "outline"} className="h-7 px-2 text-xs" onClick={() => setShowAxes((v) => !v)}>Axis labels</Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPopupZoom((z) => Math.min(2, +(z + 0.1).toFixed(1)))}>Zoom +</Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPopupZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}>Zoom −</Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPopupZoom(MAXIMIZED_CHART_DEFAULT_ZOOM)}>Reset</Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => window.print()}>Print</Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => document.documentElement.requestFullscreen?.()}>Fullscreen</Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setIsMaximized(false)}>Close</Button>
          </div>

          {/* Main content - Chart */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 flex items-center justify-center overflow-auto p-6 md:p-8" style={accentBackgroundStyle(effectiveAccent, chartBackground, chartBackgroundDirection)}>
              <div
                className={cn(
                  "w-full min-h-[24rem] flex items-center justify-center",
                  !showLabels && "[&_.recharts-label-list]:hidden [&_.recharts-label]:hidden",
                  !showLegend && "[&_.recharts-legend-wrapper]:hidden",
                  !showGrid && "[&_.recharts-cartesian-grid]:hidden [&_.recharts-polar-grid]:hidden",
                  !showAxes && "[&_.recharts-cartesian-axis]:hidden [&_.recharts-polar-angle-axis]:hidden [&_.recharts-polar-radius-axis]:hidden"
                )}
                style={{ transform: `scale(${popupZoom})`, transformOrigin: "center center" }}
              >
                {children}
              </div>
            </div>
          </div>

          {/* Footer with info */}
          <div className="flex min-h-10 items-center justify-between border-t px-6 py-2 text-xs" style={{ borderColor: `color-mix(in oklch, ${effectiveAccent} 20%, var(--border))` }}>
            <span className="text-muted-foreground">Click chart elements to drill down • Double-click chart card to close</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={() => setIsMaximized(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
