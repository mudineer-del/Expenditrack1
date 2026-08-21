import { Sector } from "recharts"
import type { PieSectorDataItem } from "recharts"

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
