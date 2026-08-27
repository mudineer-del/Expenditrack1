import type { ReactNode } from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { CHART_MEASURES, chartMeasureLabel, GROUP_BY_OPTIONS, reportGroupLabel, type ChartMeasure } from "@/lib/reports"
import { useDisplayStore, type ChartDimension, type ChartSlotId } from "@/store/useDisplayStore"

const AUTO_DIMENSION = "__auto__"

/** Wraps a single chart with a right-click menu offering the same "Group by" / "Measure"
 *  controls as Settings ▸ Format ▸ Charts, scoped to just this chart's slot — a faster,
 *  in-place way to reach the exact same `chartSlots` config every chart card already reads
 *  (see DashboardPage.tsx, VendorDetailSheet.tsx, etc.). `hasDimension` mirrors that slot's
 *  entry in FormatDialog.tsx's chart-data rows. */
export function ChartSlotContextMenu({
  id,
  hasDimension,
  children,
}: {
  id: ChartSlotId
  hasDimension: boolean
  children: ReactNode
}) {
  const cfg = useDisplayStore((s) => s.chartSlots[id])
  const setChartSlot = useDisplayStore((s) => s.setChartSlot)
  const canBeAuto = id === "dashBreakdown"

  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents">{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
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
      </ContextMenuContent>
    </ContextMenu>
  )
}
