import type { ReactNode } from "react"
import type { ChartTypeOption } from "@/components/dashboard/ChartTypeMenu"
import { ChartZoomStepper, chartZoomStyle } from "@/components/dashboard/ChartZoomStepper"
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

const CHART_3D_TYPES = new Set<ChartType>(["donut3d", "donut3dExploded", "donutSemi3d", "bar3d", "area3d"])

const DEPTH_PRESETS: { value: number; label: string }[] = [
  { value: 0.7, label: "Shallow" },
  { value: 1, label: "Default" },
  { value: 1.4, label: "Deep" },
]
const TILT_PRESETS: { value: number; label: string }[] = [
  { value: 18, label: "Low" },
  { value: 35, label: "Medium" },
  { value: 55, label: "High" },
]

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
  const reduce3DEffects = useDisplayStore((s) => s.reduce3DEffects)
  const setReduce3DEffects = useDisplayStore((s) => s.setReduce3DEffects)
  const chart3DDepth = useDisplayStore((s) => s.chart3DDepth)
  const setChart3DDepth = useDisplayStore((s) => s.setChart3DDepth)
  const chart3DTilt = useDisplayStore((s) => s.chart3DTilt)
  const setChart3DTilt = useDisplayStore((s) => s.setChart3DTilt)
  const is3DType = chartTypeValue !== undefined && CHART_3D_TYPES.has(chartTypeValue)

  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents" style={chartZoomStyle(cfg.sizePercent)}>
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

        {is3DType && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>3D effects</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuCheckboxItem checked={reduce3DEffects} onCheckedChange={setReduce3DEffects}>
                Reduce 3D effects
              </ContextMenuCheckboxItem>
              <ContextMenuSeparator />
              <ContextMenuLabel>Depth</ContextMenuLabel>
              <ContextMenuRadioGroup value={String(chart3DDepth)} onValueChange={(v) => setChart3DDepth(Number(v))}>
                {DEPTH_PRESETS.map((d) => (
                  <ContextMenuRadioItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
              <ContextMenuSeparator />
              <ContextMenuLabel>Tilt</ContextMenuLabel>
              <ContextMenuRadioGroup value={String(chart3DTilt)} onValueChange={(v) => setChart3DTilt(Number(v))}>
                {TILT_PRESETS.map((t) => (
                  <ContextMenuRadioItem key={t.value} value={String(t.value)}>
                    {t.label}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        <ContextMenuSeparator />
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-sm">Chart zoom</span>
          <ChartZoomStepper id={id} />
        </div>
      </ContextMenuContent>
    </ContextMenu>
  )
}
