import { cn } from "@/lib/utils"

/** Floating tooltip for every WebGL 3D chart scene — a plain fixed-position DOM element
 *  (not a drei `<Html>` anchored inside the 3D scene) so it always renders crisp, upright
 *  text regardless of camera tilt, and can be positioned straight from the pointer event's
 *  real screen coordinates without any 3D-to-screen projection math. Styled to match the
 *  app's existing `ChartTooltipContent` look so a 3D chart's tooltip reads as the same
 *  product as every SVG chart's tooltip. */
export function Chart3DTooltip({
  x,
  y,
  title,
  accent,
  rows,
}: {
  x: number
  y: number
  title: string
  accent?: string
  rows: { label: string; value: string }[]
}) {
  return (
    <div
      className="pointer-events-none fixed z-50 min-w-36 max-w-64 rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg"
      style={{ left: x + 16, top: y + 16 }}
      role="status"
    >
      <div className="mb-1 flex items-center gap-1.5 font-semibold">
        {accent && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />}
        <span className="truncate">{title}</span>
      </div>
      <div className="grid gap-0.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 text-muted-foreground">
            <span>{r.label}</span>
            <span className="font-medium tabular-nums text-foreground">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Click-to-toggle legend shared by every WebGL 3D chart scene — hiding a category filters
 *  it out of the scene's own geometry/percentage math (each scene recomputes totals from
 *  only the visible data), not just its color. */
export function Chart3DLegend({
  items,
  hidden,
  onToggle,
}: {
  items: { key: string; label: string; color: string }[]
  hidden: Set<string>
  onToggle: (key: string) => void
}) {
  if (items.length < 2) return null
  return (
    <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-1 text-[11px]">
      {items.map((d) => {
        const isHidden = hidden.has(d.key)
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onToggle(d.key)}
            className={cn(
              "inline-flex min-h-6 items-center gap-1.5 rounded px-1.5 py-0.5 transition-opacity hover:bg-muted",
              isHidden && "opacity-40",
            )}
            aria-pressed={!isHidden}
            title={isHidden ? `Show ${d.label}` : `Hide ${d.label}`}
          >
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
            <span className={cn(isHidden && "line-through")}>{d.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Chart3DEmpty({ message }: { message: string }) {
  return <div className="flex h-[var(--chart-h)] items-center justify-center text-sm text-muted-foreground">{message}</div>
}

/** Minimal, theme-aware "loading the 3D engine" placeholder shown while the Three.js scene
 *  chunk (lazy-loaded — see Chart3DBoundary) is still downloading/parsing. Matches the
 *  chart's own footprint so there's no layout shift once the real scene mounts. */
export function Chart3DLoading() {
  return (
    <div className="flex h-[var(--chart-h)] w-full animate-pulse items-center justify-center rounded-md bg-muted/40 text-xs text-muted-foreground">
      Loading 3D chart…
    </div>
  )
}
