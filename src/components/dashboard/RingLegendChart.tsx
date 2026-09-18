import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Cell, Pie, PieChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { fmtMoney } from "@/lib/dashboard"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/useIsMobile"
import { DONUT_CORNER_RADIUS, DONUT_PAD_ANGLE, donutActiveShape, makeDonutOuterLabel } from "./donut3d"
import type { Chart3DDatum } from "./chart3d"
import type { Invoice } from "@/types/invoice"

const PREVIEW_ROWS = 4

/** ZoomInfo-style "ring chart with a side legend" — a donut on the left (same outer
 *  numeric labels every other 2D donut in the app uses) plus a legend list on the right
 *  where each row expands in place to a short preview of that slice's invoices, with a
 *  "View all" link into the same full drill-down dialog every other chart type already
 *  opens on click. Takes the same Chart3DDatum[] shape the WebGL 3D donut/bar charts use,
 *  so any chart that already prepares that array for chartType === "donut3d" gets this
 *  chart type for free by passing the same array through. */
export function RingLegendChart({
  data,
  formatValue = (v) => fmtMoney(v),
  onOpenAll,
}: {
  data: Chart3DDatum[]
  formatValue?: (v: number) => string
  /** Opens the full invoice list for a slice — omit for data with no underlying invoices
   *  (e.g. well-cost budget categories), which just hides the "View all" link. */
  onOpenAll?: (d: Chart3DDatum) => void
}) {
  const isMobile = useIsMobile()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  if (!data.length) return null

  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0)
  const config: ChartConfig = Object.fromEntries(data.map((d) => [d.key, { label: d.label, color: d.color }]))
  const colors = data.map((d) => d.color)

  return (
    <div className={cn("flex h-full w-full gap-3", isMobile && "flex-col")}>
      {data.length === 1 ? (
        // A single 100%-share slice can't be drawn as one continuous SVG arc (its start
        // and end point coincide) — Recharts renders it a hair short of a full circle,
        // which with this donut's thick stroke reads as a visible wedge cut out of an
        // otherwise "whole" ring. A plain CSS ring sidesteps that Recharts quirk entirely.
        <div className={cn("flex shrink-0 items-center justify-center", isMobile ? "h-[45%] w-full" : "h-full w-[44%]")}>
          <div className="flex size-28 items-center justify-center rounded-full" style={{ backgroundColor: data[0].color }}>
            <div className="flex size-[58%] items-center justify-center rounded-full bg-card">
              <span className="text-lg font-bold tabular-nums">100%</span>
            </div>
          </div>
        </div>
      ) : (
        <ChartContainer config={config} className={cn("shrink-0", isMobile ? "h-[55%] w-full" : "h-full w-[44%]")}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatValue(Number(v))} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={isMobile ? "50%" : "46%"}
              outerRadius="78%"
              paddingAngle={DONUT_PAD_ANGLE}
              cornerRadius={DONUT_CORNER_RADIUS}
              activeShape={donutActiveShape}
              label={makeDonutOuterLabel(colors, 20, data.map((d) => ({ name: d.label, value: d.value })))}
              labelLine={false}
              isAnimationActive={false}
              cursor={onOpenAll ? "pointer" : undefined}
              onClick={(_, index) => onOpenAll?.(data[index])}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      )}
      <div className="min-w-0 flex-1 divide-y overflow-y-auto rounded-lg border">
        {data.map((d) => {
          const expanded = expandedKey === d.key
          const share = total > 0 ? Math.round((Math.max(0, d.value) / total) * 100) : 0
          const invoices = (d.invoices as Invoice[] | undefined) ?? []
          return (
            <div key={d.key}>
              <button
                type="button"
                onClick={() => setExpandedKey(expanded ? null : d.key)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-muted/60"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="min-w-0 flex-1 truncate">{d.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{formatValue(d.value)}</span>
                <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")} />
              </button>
              {expanded && (
                <div className="bg-muted/30 px-2.5 py-2 text-xs text-muted-foreground">
                  <p className={invoices.length ? "mb-1.5" : undefined}>
                    {share}% of total · {formatValue(d.value)}
                  </p>
                  {invoices.length > 0 && (
                    <div className="grid gap-1">
                      {invoices.slice(0, PREVIEW_ROWS).map((inv) => (
                        <div key={inv.id} className="flex items-center justify-between gap-2">
                          <span className="truncate">{inv.invoiceNo || `#${inv.srNo}`}</span>
                          <span className="shrink-0 tabular-nums">{fmtMoney(inv.amountInclTax)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {onOpenAll && invoices.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenAll(d)
                      }}
                      className="mt-1.5 font-medium text-primary hover:underline"
                    >
                      View all {invoices.length} →
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
