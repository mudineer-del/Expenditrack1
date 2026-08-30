import { Minus, Plus } from "lucide-react"
import { useDisplayStore, type ChartSlotId } from "@/store/useDisplayStore"

export const CHART_ZOOM_MIN = 60
export const CHART_ZOOM_MAX = 160
export const CHART_ZOOM_STEP = 10

/** CSS var override for one chart's zoom — pass to the element wrapping that chart (see
 *  ChartSlotContextMenu's trigger, which already carries `--chart-h` down via inheritance
 *  since it's `display: contents`). `undefined`/100 means "don't override" — every other
 *  chart on the page keeps reading the cardScale-driven default straight from `:root`. */
export function chartZoomStyle(sizePercent: number | undefined): React.CSSProperties | undefined {
  if (!sizePercent || sizePercent === 100) return undefined
  return { "--chart-h": `calc(var(--chart-h) * ${sizePercent / 100})` } as React.CSSProperties
}

/** Small always-visible −/percentage/+ zoom control for one chart — writes the exact same
 *  `chartSlots[id].sizePercent` the chart's own right-click menu's "Chart size" row does,
 *  just surfaced directly on the card so reaching it doesn't require a right-click. */
export function ChartZoomStepper({ id }: { id: ChartSlotId }) {
  const percent = useDisplayStore((s) => s.chartSlots[id].sizePercent) ?? 100
  const setChartSlot = useDisplayStore((s) => s.setChartSlot)

  function nudge(delta: number) {
    const next = Math.max(CHART_ZOOM_MIN, Math.min(CHART_ZOOM_MAX, percent + delta))
    setChartSlot(id, { sizePercent: next === 100 ? undefined : next })
  }

  return (
    <div className="flex items-center gap-0.5 rounded-md border pr-0.5 pl-1">
      <button
        type="button"
        disabled={percent <= CHART_ZOOM_MIN}
        onClick={() => nudge(-CHART_ZOOM_STEP)}
        title="Zoom out"
        className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="size-3" />
      </button>
      <span className="w-8 text-center text-[10.5px] font-semibold tabular-nums text-muted-foreground">{percent}%</span>
      <button
        type="button"
        disabled={percent >= CHART_ZOOM_MAX}
        onClick={() => nudge(CHART_ZOOM_STEP)}
        title="Zoom in"
        className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="size-3" />
      </button>
    </div>
  )
}
