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
 *  itself; this only positions the text past the line's outer end).
 *
 *  Colored per-slice (from the same `colors` array the chart's own `<Cell>`s already
 *  cycle through) and bold, rather than one flat muted tone — a label should read as
 *  "that slice, spelled out" at a glance, not blend into the chrome around it. */
export function makeDonutOuterLabel(colors: string[]) {
  return function DonutOuterLabel(props: PieLabelRenderProps) {
    const { cx, cy, midAngle, outerRadius, percent, name, index } = props
    if (cx == null || cy == null || midAngle == null || outerRadius == null) return null
    // Slices under 2% crowd their neighbors with barely-readable "(0%)"/"(1%)" labels
    // that collide at the shared angle real near-zero values cluster around — skip
    // them; the value is still available via hover/tap.
    if (percent != null && percent < 0.02) return null
    const radius = Number(outerRadius) + 18
    const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN)
    const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN)
    const pct = percent != null ? `${Math.round(percent * 100)}%` : ""
    const color = colors[Number(index ?? 0) % colors.length]
    return (
      <text
        x={x}
        y={y}
        fill={color}
        fontSize={11.5}
        fontWeight={700}
        textAnchor={x > Number(cx) ? "start" : "end"}
        dominantBaseline="central"
      >
        {name} {pct && `(${pct})`}
      </text>
    )
  }
}

interface RadarLabelProps {
  x?: unknown
  y?: unknown
  value?: unknown
  index?: unknown
}

/** Colored, bold value labels for a Radar chart's vertices — pass as its
 *  `<LabelList content={...} />` child. Radar has no per-vertex `<Cell>` the way a
 *  Pie/Bar does (one `<Radar>` is one flat-colored series), so label color here comes
 *  from the same per-category palette the chart's pie/bar view already cycles through,
 *  keeping "which category is which" legible without a legend.
 *
 *  Recharts only renders these labels once the entrance animation settles
 *  (`showLabels: !isAnimating` internally, same gotcha as donutOuterLabel below) — and
 *  since every render passes a freshly-sliced data array, that transition never actually
 *  settles. Every `<Radar>` using this must pass
 *  `isAnimationActive={labelsEnabled ? false : animate}` so the labels can show. */
export function makePolarValueLabel(colors: string[], formatter?: (v: number) => string, offsetY = -10) {
  return function PolarValueLabel(props: RadarLabelProps) {
    const { x, y, value, index } = props
    if (x == null || y == null || value == null || typeof index !== "number") return null
    const color = colors[index % colors.length]
    const text = formatter ? formatter(Number(value)) : String(value)
    return (
      <text x={Number(x)} y={Number(y) + offsetY} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
        {text}
      </text>
    )
  }
}

interface RadialBarLabelProps {
  viewBox?: unknown
  value?: unknown
  index?: unknown
}

interface PolarViewBox {
  cx?: number
  cy?: number
  outerRadius?: number
  startAngle?: number
  endAngle?: number
}

/** Every ring in a RadialBar shares the same start angle (the top) — the amount each one
 *  sweeps (and so where its label anchors, at the end of that sweep) depends only on its
 *  own value versus the largest ring's. Rings with a similar value sweep by a similar
 *  amount and so land at a similar angle, which crowds their labels together even once
 *  they're pushed out. This sorts rings by that angle and hands out extra outward push
 *  (indexed by original position, for makeRadialBarValueLabel's `extraOffsetByIndex`) to
 *  whichever ones land within `thresholdDeg` of a neighbor, so a cluster of close values
 *  fans out into a staircase instead of overlapping at the same radius. */
export function computeRadialLabelStagger(values: number[], thresholdDeg = 16, stepPx = 20): Record<number, number> {
  const maxValue = Math.max(...values, 1)
  const angleOf = (v: number) => (((90 - (v / maxValue) * 360) % 360) + 360) % 360
  const sorted = values.map((v, i) => ({ i, angle: angleOf(v) })).sort((a, b) => a.angle - b.angle)
  const offsets: Record<number, number> = {}
  let lastAngle: number | null = null
  let stack = 0
  for (const e of sorted) {
    stack = lastAngle !== null && Math.abs(e.angle - lastAngle) < thresholdDeg ? stack + 1 : 0
    offsets[e.i] = stack * stepPx
    lastAngle = e.angle
  }
  return offsets
}

/** Colored, bold value labels for a RadialBar chart's rings, styled and positioned the
 *  same way donutOuterLabel treats a pie: text sitting well outside the shape with a thin
 *  leader line back to it, skipping anything under a 2% share so near-invisible slivers
 *  don't crowd their neighbors with unreadable labels — same threshold, same look.
 *
 *  RadialBar hands its label a *polar* `viewBox` (`cx`/`cy`/angles), not the flat `{x, y}`
 *  Bar/Line/Radar give a custom `content` function, so the angle-to-point math happens
 *  here, anchored on each ring's `endAngle` (where the bar visually stops) rather than a
 *  midpoint — every ring shares the same start angle (the top), so anchoring on the end
 *  is what actually spreads rings with different values around the circle instead of
 *  bunching them all near that shared start. `extraOffsetByIndex` (from
 *  computeRadialLabelStagger) pushes closely-angled rings further apart still. */
export function makeRadialBarValueLabel(colors: string[], formatter?: (v: number) => string, extraOffsetByIndex?: Record<number, number>) {
  return function RadialBarValueLabel(props: RadialBarLabelProps) {
    const { value, index } = props
    const viewBox = props.viewBox as PolarViewBox | undefined
    if (!viewBox || value == null || typeof index !== "number") return null
    const { cx, cy, outerRadius, startAngle, endAngle } = viewBox
    if (cx == null || cy == null || outerRadius == null || startAngle == null || endAngle == null) return null
    if (Math.abs(startAngle - endAngle) < 0.02 * 360) return null
    const cos = Math.cos(-endAngle * RADIAN)
    const sin = Math.sin(-endAngle * RADIAN)
    const tipX = cx + outerRadius * cos
    const tipY = cy + outerRadius * sin
    const labelRadius = outerRadius + 34 + (extraOffsetByIndex?.[index] ?? 0)
    const labelX = cx + labelRadius * cos
    const labelY = cy + labelRadius * sin
    const color = colors[index % colors.length]
    const text = formatter ? formatter(Number(value)) : String(value)
    const anchorRight = labelX >= cx
    return (
      <g>
        <line x1={tipX} y1={tipY} x2={labelX} y2={labelY} stroke={color} strokeWidth={1} strokeOpacity={0.6} />
        <text
          x={labelX + (anchorRight ? 4 : -4)}
          y={labelY}
          textAnchor={anchorRight ? "start" : "end"}
          dominantBaseline="central"
          fontSize={11}
          fontWeight={700}
          fill={color}
        >
          {text}
        </text>
      </g>
    )
  }
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
