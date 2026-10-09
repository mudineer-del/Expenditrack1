import { Minus, Plus } from "lucide-react"
import { useDisplayStore } from "@/store/useDisplayStore"

/** Excel-style workspace zoom control. It sits outside the scaled shell so the
 * control itself stays readable while the shell zoom changes underneath it. */
export function AppZoomBar() {
  const zoom = useDisplayStore((s) => s.appZoom)
  const setAppZoom = useDisplayStore((s) => s.setAppZoom)

  return (
    <div className="fixed bottom-2 right-3 z-[60] flex h-8 items-center gap-1 rounded-md border bg-background/95 px-2 shadow-md backdrop-blur">
      <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setAppZoom(zoom - 5)} disabled={zoom <= 55} aria-label="Zoom out">
        <Minus className="size-3.5" />
      </button>
      <input
        type="range"
        min="55"
        max="100"
        step="5"
        value={zoom}
        onChange={(e) => setAppZoom(Number(e.target.value))}
        aria-label="Application zoom"
        className="w-28 accent-primary"
      />
      <button type="button" className="rounded p-1 text-muted-foreground hover:bg-muted" onClick={() => setAppZoom(zoom + 5)} disabled={zoom >= 100} aria-label="Zoom in">
        <Plus className="size-3.5" />
      </button>
      <button type="button" className="min-w-10 rounded px-1 text-center text-[11px] font-medium tabular-nums hover:bg-muted" onClick={() => setAppZoom(100)} title="Reset application zoom">
        {zoom}%
      </button>
    </div>
  )
}
