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
  composed: BarChart3,
  scatter: AreaChart,
  radial: Radar,
  treemap: PieChart,
  funnel: BarChart3,
  horizontalBar: BarChart3,
}

export interface ChartTypeOption {
  type: ChartType
  label: string
}

export const CHART_OPTIONS = {
  trend: [
    { type: "bar", label: "Bar" },
    { type: "line", label: "Line" },
    { type: "area", label: "Area" },
    { type: "composed", label: "Composed" },
    { type: "scatter", label: "Scatter" },
  ],
  service: [
    { type: "bar", label: "Bar" },
    { type: "line", label: "Line" },
    { type: "area", label: "Area" },
    { type: "pie", label: "Donut" },
    { type: "radar", label: "Radar" },
    { type: "treemap", label: "Treemap" },
    { type: "radial", label: "Radial bar" },
  ],
  contractor: [
    { type: "bar", label: "Stacked bar" },
    { type: "line", label: "Line" },
    { type: "area", label: "Area" },
    { type: "pie", label: "Donut" },
    { type: "radar", label: "Radar" },
    { type: "horizontalBar", label: "Horizontal bar" },
    { type: "treemap", label: "Treemap" },
  ],
  invoices: [
    { type: "bar", label: "Bar" },
    { type: "line", label: "Line" },
    { type: "area", label: "Area" },
    { type: "pie", label: "Donut" },
    { type: "radar", label: "Radar" },
    { type: "horizontalBar", label: "Horizontal bar" },
    { type: "treemap", label: "Treemap" },
  ],
  status: [
    { type: "bar", label: "Bar" },
    { type: "line", label: "Line" },
    { type: "area", label: "Area" },
    { type: "pie", label: "Donut" },
    { type: "radar", label: "Radar" },
    { type: "radial", label: "Radial bar" },
    { type: "funnel", label: "Funnel" },
  ],
} satisfies Record<string, ChartTypeOption[]>

/** Small local switcher shown on each dashboard chart card — changes just that one chart's type immediately, in addition to the same control living in the Format dialog's Charts tab. */
export function ChartTypeMenu({
  value,
  onChange,
  options,
}: {
  value: ChartType
  onChange: (t: ChartType) => void
  options: ChartTypeOption[]
}) {
  const Icon = CHART_TYPE_ICONS[value]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6" title="Change chart type">
          <Icon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto gap-1 p-1" align="end">
        {options.map(({ type, label }) => {
          const TypeIcon = CHART_TYPE_ICONS[type]
          return (
            <Button
              key={type}
              variant="ghost"
              size="icon"
              className={cn("size-8", value === type && "bg-primary/10 text-primary")}
              title={label}
              aria-label={label}
              onClick={() => onChange(type)}
            >
              <TypeIcon className="size-4" />
            </Button>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}
