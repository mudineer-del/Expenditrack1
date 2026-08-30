import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CHART_MEASURES, chartMeasureLabel, GROUP_BY_OPTIONS, reportGroupLabel, type ChartMeasure } from "@/lib/reports"
import { useDisplayStore, type ChartDimension, type ChartSlotId } from "@/store/useDisplayStore"

const AUTO_DIMENSION = "__auto__"

/** Small always-visible icon button surfacing the same "Group by" / "Measure" controls a
 *  chart's right-click menu has, one click away instead of a right-click + submenu away.
 *  Writes the same `chartSlots[id]` the menu and Settings ▸ Format ▸ Charts both use. */
export function ChartDataQuickMenu({ id, hasDimension }: { id: ChartSlotId; hasDimension: boolean }) {
  const cfg = useDisplayStore((s) => s.chartSlots[id])
  const setChartSlot = useDisplayStore((s) => s.setChartSlot)
  const canBeAuto = id === "dashBreakdown"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6" title="Change what this chart shows">
          <SlidersHorizontal className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="grid w-56 gap-2.5 p-2.5" align="end">
        {hasDimension && (
          <div className="grid gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">Group by</span>
            <Select
              value={cfg.dimension ?? AUTO_DIMENSION}
              onValueChange={(v) => setChartSlot(id, { dimension: v === AUTO_DIMENSION ? undefined : (v as ChartDimension) })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canBeAuto && <SelectItem value={AUTO_DIMENSION}>Automatic</SelectItem>}
                {GROUP_BY_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {reportGroupLabel(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid gap-1">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Measure</span>
          <Select value={cfg.measure} onValueChange={(v) => setChartSlot(id, { measure: v as ChartMeasure })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHART_MEASURES.map((m) => (
                <SelectItem key={m} value={m}>
                  {chartMeasureLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
