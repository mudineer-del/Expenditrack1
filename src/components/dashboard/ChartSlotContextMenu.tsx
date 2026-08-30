import { Minus, Plus } from "lucide-react"
import type { ReactNode } from "react"
import type { ChartTypeOption } from "@/components/dashboard/ChartTypeMenu"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { CHART_MEASURES, chartMeasureLabel, GROUP_BY_OPTIONS, reportGroupLabel, type ChartMeasure } from "@/lib/reports"
import {
  useDisplayStore,
  type ChartBackground,
  type ChartBackgroundDirection,
  type ChartDimension,
  type ChartSlotId,
  type ChartType,
} from "@/store/useDisplayStore"

const AUTO_DIMENSION = "__auto__"
const SIZE_STEP_MIN = -2
const SIZE_STEP_MAX = 4

const BG_LEVELS: { key: ChartBackground; label: string }[] = [
  { key: "flat", label: "Flat" },
  { key: "subtle", label: "Subtle" },
  { key: "gradient", label: "Gradient" },
]
const BG_DIRECTIONS: { key: ChartBackgroundDirection; label: string }[] = [
  { key: "diagonal", label: "Diagonal" },
  { key: "vertical", label: "Down" },
  { key: "horizontal", label: "Across" },
  { key: "radial", label: "Radial" },
]

/** Wraps a single chart with a right-click menu holding every customization this app has
 *  for a chart card, in one place, scoped to just this chart — the same `chartSlots`
 *  data/visibility/zoom controls Settings ▸ Format ▸ Charts has, plus chart type, value
 *  labels, background, and a size stepper. `hasDimension` mirrors that slot's entry in
 *  FormatDialog.tsx's chart-data rows; `hasZoom` is only true for the three trend slots,
 *  the only ones with a Brush/zoom control; `chartType*` props are only passed by callers
 *  that already have a chart-type switcher for this chart (see ChartTypeMenu.tsx).
 *
 *  Value labels and chart background stay *app-wide* settings here (same store fields
 *  Settings writes) rather than per-chart overrides — exposed on every chart's menu for
 *  convenience, but changing one changes all of them. Only dimension/measure/visibility/
 *  zoom/size are genuinely local to this one chart. */
export function ChartSlotContextMenu({
  id,
  hasDimension,
  hasZoom,
  chartTypeOptions,
  chartTypeValue,
  onChartTypeChange,
  children,
}: {
  id: ChartSlotId
  hasDimension: boolean
  hasZoom?: boolean
  chartTypeOptions?: ChartTypeOption[]
  chartTypeValue?: ChartType
  onChartTypeChange?: (t: ChartType) => void
  children: ReactNode
}) {
  const cfg = useDisplayStore((s) => s.chartSlots[id])
  const setChartSlot = useDisplayStore((s) => s.setChartSlot)
  const canBeAuto = id === "dashBreakdown"

  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const setChartLabelsEnabled = useDisplayStore((s) => s.setChartLabelsEnabled)
  const labelPosition = useDisplayStore((s) => s.chartLabelPosition)
  const setChartLabelPosition = useDisplayStore((s) => s.setChartLabelPosition)
  const background = useDisplayStore((s) => s.chartBackground)
  const setChartBackground = useDisplayStore((s) => s.setChartBackground)
  const backgroundDirection = useDisplayStore((s) => s.chartBackgroundDirection)
  const setChartBackgroundDirection = useDisplayStore((s) => s.setChartBackgroundDirection)

  const sizeStep = cfg.sizeStep ?? 0
  function nudgeSize(delta: number) {
    const next = Math.max(SIZE_STEP_MIN, Math.min(SIZE_STEP_MAX, sizeStep + delta))
    setChartSlot(id, { sizeStep: next })
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="contents"
        style={sizeStep ? ({ "--chart-h": `calc(var(--chart-h) + ${sizeStep * 2}rem)` } as React.CSSProperties) : undefined}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {hasDimension && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Group by</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup
                value={cfg.dimension ?? AUTO_DIMENSION}
                onValueChange={(v) => setChartSlot(id, { dimension: v === AUTO_DIMENSION ? undefined : (v as ChartDimension) })}
              >
                {canBeAuto && <ContextMenuRadioItem value={AUTO_DIMENSION}>Automatic</ContextMenuRadioItem>}
                {GROUP_BY_OPTIONS.map((g) => (
                  <ContextMenuRadioItem key={g} value={g}>
                    {reportGroupLabel(g)}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSub>
          <ContextMenuSubTrigger>Measure</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup value={cfg.measure} onValueChange={(v) => setChartSlot(id, { measure: v as ChartMeasure })}>
              {CHART_MEASURES.map((m) => (
                <ContextMenuRadioItem key={m} value={m}>
                  {chartMeasureLabel(m)}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {chartTypeOptions && onChartTypeChange && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>Chart type</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup value={chartTypeValue} onValueChange={(v) => onChartTypeChange(v as ChartType)}>
                {chartTypeOptions.map((o) => (
                  <ContextMenuRadioItem key={o.type} value={o.type}>
                    {o.label}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked={!cfg.hidden} onCheckedChange={(checked) => setChartSlot(id, { hidden: !checked })}>
          Show chart
        </ContextMenuCheckboxItem>
        {hasZoom && (
          <ContextMenuCheckboxItem checked={cfg.zoomEnabled ?? true} onCheckedChange={(checked) => setChartSlot(id, { zoomEnabled: checked })}>
            Zoom bar
          </ContextMenuCheckboxItem>
        )}

        <ContextMenuSeparator />
        <ContextMenuCheckboxItem checked={labelsEnabled} onCheckedChange={setChartLabelsEnabled}>
          Value labels
        </ContextMenuCheckboxItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Label position</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup value={labelPosition} onValueChange={(v) => setChartLabelPosition(v as "outside" | "inside")}>
              <ContextMenuRadioItem value="outside">Outside</ContextMenuRadioItem>
              <ContextMenuRadioItem value="inside">Inside</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSub>
          <ContextMenuSubTrigger>Background</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup value={background} onValueChange={(v) => setChartBackground(v as ChartBackground)}>
              {BG_LEVELS.map((l) => (
                <ContextMenuRadioItem key={l.key} value={l.key}>
                  {l.label}
                </ContextMenuRadioItem>
              ))}
            </ContextMenuRadioGroup>
            {background !== "flat" && (
              <>
                <ContextMenuSeparator />
                <ContextMenuLabel>Direction</ContextMenuLabel>
                <ContextMenuRadioGroup value={backgroundDirection} onValueChange={(v) => setChartBackgroundDirection(v as ChartBackgroundDirection)}>
                  {BG_DIRECTIONS.map((d) => (
                    <ContextMenuRadioItem key={d.key} value={d.key}>
                      {d.label}
                    </ContextMenuRadioItem>
                  ))}
                </ContextMenuRadioGroup>
              </>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-sm">Chart size</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={sizeStep <= SIZE_STEP_MIN}
              onClick={() => nudgeSize(-1)}
              className="flex size-6 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
              title="Shrink this chart"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-10 text-center text-xs tabular-nums text-muted-foreground">
              {sizeStep === 0 ? "Default" : sizeStep > 0 ? `+${sizeStep}` : sizeStep}
            </span>
            <button
              type="button"
              disabled={sizeStep >= SIZE_STEP_MAX}
              onClick={() => nudgeSize(1)}
              className="flex size-6 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
              title="Grow this chart"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>
      </ContextMenuContent>
    </ContextMenu>
  )
}
