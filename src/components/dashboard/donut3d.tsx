import { Sector } from "recharts"
import type { PieLabelRenderProps, PieSectorDataItem } from "recharts"

const RADIAN = Math.PI / 180

/** Shared look for every donut chart on the Dashboard: glossy per-slice gradient (instead
 *  of a flat fill) for a 3D, domed appearance, plus a small gap + rounded ends between
 *  slices so they read as separate objects rather than one flat disc. */
export const DONUT_CORNER_RADIUS = 6
export const DONUT_PAD_ANGLE = 2

/** Builds a `<radialGradient>` id + `<defs>` entry for a slice color, giving it a
 *  lit-from-top-left highlight fading to a darker edge — the "3D" part of the donut. */
export function donutGradientId(idBase: string, i: number) {
  return `${idBase}-${i}`
}

export function DonutDefs({ idBase, colors }: { idBase: string; colors: string[] }) {
  return (
    <defs>
      {colors.map((c, i) => (
        <radialGradient key={i} id={donutGradientId(idBase, i)} cx="32%" cy="28%" r="80%">
          <stop offset="0%" stopColor={`color-mix(in oklch, ${c} 55%, white 45%)`} />
          <stop offset="60%" stopColor={c} />
          <stop offset="100%" stopColor={`color-mix(in oklch, ${c} 78%, black 22%)`} />
        </radialGradient>
      ))}
    </defs>
  )
}

/** Desktop-only outer radius, leaving room for donutOuterLabel's ring of labels
 *  around the circle — mobile keeps the larger 80% radius since it relies on
 *  tap + tooltip instead (a ring of up to 8 label lines is unreadable on a
 *  narrow phone card). */
export const DONUT_OUTER_RADIUS_LABELED = "62%"

/** Renders each slice's name + share of total on a leader line outside the donut,
 *  so the breakdown is readable at a glance without needing to hover every slice.
 *  Pass as Pie's `label` prop together with `labelLine` (Recharts draws the line
 *  itself; this only positions the text past the line's outer end). */
export function donutOuterLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, outerRadius, percent, name } = props
  if (cx == null || cy == null || midAngle == null || outerRadius == null) return null
  // Slices under 2% crowd their neighbors with barely-readable "(0%)"/"(1%)" labels
  // that collide at the shared angle real near-zero values cluster around — skip
  // them; the value is still available via hover/tap.
  if (percent != null && percent < 0.02) return null
  const radius = Number(outerRadius) + 18
  const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN)
  const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN)
  const pct = percent != null ? `${Math.round(percent * 100)}%` : ""
  return (
    <text
      x={x}
      y={y}
      fill="var(--muted-foreground)"
      fontSize={10}
      textAnchor={x > Number(cx) ? "start" : "end"}
      dominantBaseline="central"
    >
      {name} {pct && `(${pct})`}
    </text>
  )
}

/** `activeShape` for a Pie — Recharts drives this off the same active-tooltip-index
 *  state the chart's <ChartTooltip> already tracks (hover on desktop, touch on mobile),
 *  so no extra event wiring is needed per chart. Pops the slice outward and lifts it
 *  with a drop-shadow so it visibly separates from the rest of the donut. */
export function donutActiveShape(props: PieSectorDataItem) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, cornerRadius } = props
  return (
    <g style={{ filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.32))" }}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 7}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={cornerRadius}
        fill={fill}
        stroke="var(--card)"
        strokeWidth={2}
      />
    </g>
  )
}
