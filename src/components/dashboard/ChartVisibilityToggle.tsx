import { EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDisplayStore, type ChartSlotId } from "@/store/useDisplayStore"

/** Small icon button shown on each configurable chart card — hides that one chart's card
 *  immediately. Once hidden, the card (and this button along with it) is gone from the
 *  page; bring it back from the same slot's switch in Settings ▸ Format ▸ Charts, which
 *  always lists every slot regardless of its current visibility. */
export function ChartVisibilityToggle({ id }: { id: ChartSlotId }) {
  const setChartSlot = useDisplayStore((s) => s.setChartSlot)
  return (
    <Button
      variant="ghost"
      size="icon"
      className="chart-toolbar-btn size-6"
      title="Hide this chart"
      aria-label="Hide this chart"
      onClick={() => setChartSlot(id, { hidden: true })}
    >
      <EyeOff className="size-3.5" />
    </Button>
  )
}
