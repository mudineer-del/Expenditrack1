import { Palette } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  useDisplayStore,
  type ChartBackground,
  type ChartBackgroundDirection,
  type ChartSlotId,
  type ChartType,
} from "@/store/useDisplayStore"

const CHART_3D_TYPES = new Set<ChartType>(["donut3d", "donut3dExploded", "donutSemi3d", "bar3d", "area3d"])

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

/** Titlebar-resident "Format" button — the same value-labels/background/3D-effects/zoom-bar
 *  controls ChartSlotContextMenu's right-click menu has, surfaced as a one-click popover so
 *  they don't require discovering the right-click menu. Labels/background/3D stay app-wide
 *  settings (same store fields Settings ▸ Format ▸ Charts writes) — only the zoom-bar switch
 *  is local to this one chart slot. */
export function ChartFormatMenu({ id, hasZoom, chartType }: { id: ChartSlotId; hasZoom?: boolean; chartType?: ChartType }) {
  const cfg = useDisplayStore((s) => s.chartSlots[id])
  const setChartSlot = useDisplayStore((s) => s.setChartSlot)

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
  const is3DType = chartType !== undefined && CHART_3D_TYPES.has(chartType)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="chart-toolbar-btn size-6" title="Format this chart">
          <Palette className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="grid w-64 gap-3 p-3" align="end">
        {hasZoom && (
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${id}-zoom-fmt`} className="text-xs font-normal text-muted-foreground">
              Zoom bar
            </Label>
            <Switch
              id={`${id}-zoom-fmt`}
              checked={cfg.zoomEnabled ?? true}
              onCheckedChange={(checked) => setChartSlot(id, { zoomEnabled: checked })}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`${id}-labels-fmt`} className="text-xs font-normal text-muted-foreground">
            Value labels
          </Label>
          <Switch id={`${id}-labels-fmt`} checked={labelsEnabled} onCheckedChange={setChartLabelsEnabled} />
        </div>
        {labelsEnabled && (
          <div className="grid gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Label position</span>
            <Select value={labelPosition} onValueChange={(v) => setChartLabelPosition(v as "outside" | "inside")}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outside">Outside</SelectItem>
                <SelectItem value="inside">Inside</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-1 border-t pt-2.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Chart background</span>
          <Select value={background} onValueChange={(v) => setChartBackground(v as ChartBackground)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BG_LEVELS.map((l) => (
                <SelectItem key={l.key} value={l.key}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {background !== "flat" && (
          <div className="grid gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Direction</span>
            <Select value={backgroundDirection} onValueChange={(v) => setChartBackgroundDirection(v as ChartBackgroundDirection)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BG_DIRECTIONS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {is3DType && (
          <div className="grid gap-2.5 border-t pt-2.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${id}-reduce3d-fmt`} className="text-xs font-normal text-muted-foreground">
                Reduce 3D effects
              </Label>
              <Switch id={`${id}-reduce3d-fmt`} checked={reduce3DEffects} onCheckedChange={setReduce3DEffects} />
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Depth</span>
              <Select value={String(chart3DDepth)} onValueChange={(v) => setChart3DDepth(Number(v))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPTH_PRESETS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Tilt</span>
              <Select value={String(chart3DTilt)} onValueChange={(v) => setChart3DTilt(Number(v))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TILT_PRESETS.map((t) => (
                    <SelectItem key={t.value} value={String(t.value)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
