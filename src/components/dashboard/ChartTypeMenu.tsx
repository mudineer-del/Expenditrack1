import { AreaChart, BarChart3, LineChart, PieChart, Radar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ChartType } from "@/store/useDisplayStore"

const CHART_TYPE_ICONS: Record<ChartType, typeof BarChart3> = {
  bar: BarChart3,
  line: LineChart,
  area: AreaChart,
  pie: PieChart,
  radar: Radar,
}

/** Small local switcher shown on each dashboard chart card — changes just that one chart's type immediately, in addition to the same control living in the Format dialog's Charts tab. */
export function ChartTypeMenu({ value, onChange }: { value: ChartType; onChange: (t: ChartType) => void }) {
  const Icon = CHART_TYPE_ICONS[value]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6" title="Change chart type">
          <Icon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto gap-1 p-1" align="end">
        {(Object.keys(CHART_TYPE_ICONS) as ChartType[]).map((t) => {
          const TypeIcon = CHART_TYPE_ICONS[t]
          return (
            <Button
              key={t}
              variant="ghost"
              size="icon"
              className={cn("size-8", value === t && "bg-primary/10 text-primary")}
              title={t}
              onClick={() => onChange(t)}
            >
              <TypeIcon className="size-4" />
            </Button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
