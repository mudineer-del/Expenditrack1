import { Sector } from "recharts"
import type { PieLabelRenderProps, PieSectorDataItem } from "recharts"

const RADIAN = Math.PI / 180

/** Shared look for every donut chart on the Dashboard: an extruded 3D wedge (see
 *  `donut3DShape` below) plus a small gap + rounded ends between slices so they read as
 *  separate objects rather than one flat disc. */
export const DONUT_CORNER_RADIUS = 6
export const DONUT_PAD_ANGLE = 2

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
export function makeDonutOuterLabel(
  colors: string[],
  distance = 18,
  labelData: Array<{ name: string; value: number }> = [],
) {
  const total = labelData.reduce((sum, entry) => sum + Math.max(0, entry.value), 0)
  let cumulative = 0
  const polarItems = labelData.map((entry, itemIndex) => {
    const share = total > 0 ? Math.max(0, entry.value) / total : 0
    const middleShare = total > 0 ? (cumulative + Math.max(0, entry.value) / 2) / total : 0
    cumulative += Math.max(0, entry.value)
    const angle = 90 - middleShare * 360
    return { itemIndex, share, value: entry.value, side: Math.cos(-angle * RADIAN) >= 0 ? "right" as const : "left" as const, ideal: Math.sin(-angle * RADIAN) }
  })
  // Direct labels remain useful only while they are legible. Keep the ten most
  // significant categories; every other slice remains available through tooltip/drill.
  const eligible = new Set(
    polarItems.filter((item) => item.share >= 0.02).sort((a, b) => b.value - a.value).slice(0, 10).map((item) => item.itemIndex),
  )
  const lanes = new Map<number, { rank: number; count: number }>()
  for (const side of ["left", "right"] as const) {
    const sideItems = polarItems.filter((item) => eligible.has(item.itemIndex) && item.side === side).sort((a, b) => a.ideal - b.ideal)
    sideItems.forEach((item, rank) => lanes.set(item.itemIndex, { rank, count: sideItems.length }))
  }
  return function DonutOuterLabel(props: PieLabelRenderProps) {
    const { cx, cy, midAngle, outerRadius, percent, name, index } = props
    if (cx == null || cy == null || midAngle == null || outerRadius == null) return null
    const itemIndex = Number(index ?? 0)
    const lane = lanes.get(itemIndex)
    if (labelData.length && !lane) return null
    if (!labelData.length && percent != null && percent < 0.02) return null
    const centerX = Number(cx)
    const centerY = Number(cy)
    const ringRadius = Number(outerRadius)
    const cos = Math.cos(-midAngle * RADIAN)
    const sin = Math.sin(-midAngle * RADIAN)
    const tipX = centerX + ringRadius * cos
    const tipY = centerY + ringRadius * sin
    const side: "left" | "right" = cos >= 0 ? "right" : "left"
    const labelX = centerX + (side === "right" ? 1 : -1) * (ringRadius + distance + 24)
    const availableHeight = ringRadius * 2 + 72
    const laneGap = lane && lane.count > 1 ? Math.min(21, availableHeight / (lane.count - 1)) : 0
    const y = lane ? centerY + (lane.rank - (lane.count - 1) / 2) * laneGap : centerY + (ringRadius + distance) * sin
    const elbowX = centerX + (side === "right" ? 1 : -1) * (ringRadius + 10)
    const pct = percent != null ? `${Math.round(percent * 100)}%` : ""
    const color = colors[itemIndex % colors.length]
    const rawName = String(labelData[itemIndex]?.name ?? name ?? "")
    const displayName = rawName.length > 26 ? `${rawName.slice(0, 24)}…` : rawName
    return (
      <g>
        <polyline points={`${tipX},${tipY} ${elbowX},${y} ${labelX},${y}`} fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.62} />
      <text
        x={labelX + (side === "right" ? 5 : -5)}
        y={y}
        fill={color}
        fontSize={11.5}
        fontWeight={700}
        textAnchor={side === "right" ? "start" : "end"}
        dominantBaseline="central"
        paintOrder="stroke"
        stroke="var(--card)"
        strokeWidth={3}
        strokeLinejoin="round"
      >
        {displayName} {pct && `(${pct})`}
      </text>
      </g>
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
  payload?: Record<string, unknown>
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
export function makeRadialBarValueLabel(
  colors: string[],
  formatter?: (v: number) => string,
  labelData?: Record<number, number> | Array<{ name: string; value: number }>,
) {
  const entries = Array.isArray(labelData) ? labelData : []
  const maxValue = Math.max(...entries.map((entry) => entry.value), 1)
  const layout = entries.map((entry, itemIndex) => {
    const itemEndAngle = 90 - (entry.value / maxValue) * 360
    const itemCos = Math.cos(-itemEndAngle * RADIAN)
    const itemSin = Math.sin(-itemEndAngle * RADIAN)
    return { itemIndex, value: entry.value, side: itemCos >= 0 ? "right" as const : "left" as const, ideal: itemSin }
  })
  const lanes = new Map<number, { rank: number; count: number }>()
  for (const side of ["left", "right"] as const) {
    const sideItems = layout.filter((item) => item.value > 0 && item.side === side).sort((a, b) => a.ideal - b.ideal)
    sideItems.forEach((item, rank) => lanes.set(item.itemIndex, { rank, count: sideItems.length }))
  }
  return function RadialBarValueLabel(props: RadialBarLabelProps) {
    const { value, index, payload } = props
    const viewBox = props.viewBox as PolarViewBox | undefined
    if (!viewBox || value == null || typeof index !== "number") return null
    const { cx, cy, outerRadius, startAngle, endAngle } = viewBox
    if (cx == null || cy == null || outerRadius == null || startAngle == null || endAngle == null) return null
    if (Math.abs(startAngle - endAngle) < 0.02 * 360) return null
    const cos = Math.cos(-endAngle * RADIAN)
    const sin = Math.sin(-endAngle * RADIAN)
    const tipX = cx + outerRadius * cos
    const tipY = cy + outerRadius * sin
    const side = cos >= 0 ? "right" : "left"
    const lane = lanes.get(index)
    const availableHeight = outerRadius * 2 + 94
    const laneGap = lane && lane.count > 1 ? Math.min(34, availableHeight / (lane.count - 1)) : 0
    const labelY = lane ? cy + (lane.rank - (lane.count - 1) / 2) * laneGap : cy + outerRadius * sin
    const labelX = cx + (side === "right" ? 1 : -1) * (outerRadius + 90)
    const elbowX = cx + (side === "right" ? 1 : -1) * (outerRadius + 18)
    const color = colors[index % colors.length]
    const text = formatter ? formatter(Number(value)) : String(value)
    const rawCategory = entries[index]?.name ?? String(payload?.service ?? payload?.vendor ?? payload?.type ?? payload?.status ?? payload?.name ?? "")
    const category = rawCategory.length > 24 ? `${rawCategory.slice(0, 22)}…` : rawCategory
    const anchorRight = side === "right"
    return (
      <g>
        <polyline
          points={`${tipX},${tipY} ${elbowX},${labelY} ${labelX},${labelY}`}
          fill="none"
          stroke={color}
          strokeWidth={1}
          strokeOpacity={0.52}
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={labelX + (anchorRight ? 4 : -4)}
          y={labelY - (category ? 6 : 0)}
          textAnchor={anchorRight ? "start" : "end"}
          dominantBaseline="central"
          fontSize={10.5}
          fontWeight={700}
          fill={color}
          paintOrder="stroke"
          stroke="var(--card)"
          strokeWidth={3}
          strokeLinejoin="round"
        >
          {category && <tspan x={labelX + (anchorRight ? 4 : -4)} dy="0" stroke="var(--card)">{category}</tspan>}
          <tspan x={labelX + (anchorRight ? 4 : -4)} dy={category ? "1.3em" : "0"} fontWeight={650} stroke="var(--card)">{text}</tspan>
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

/** Extrusion depth (px) for the isometric-wedge donut/pie look below — a fixed pixel
 *  height (not proportional to radius) matches how real "3D pie" renderers do it: every
 *  wedge gets the same physical thickness regardless of the chart's overall size. */
export const DONUT_3D_DEPTH = 7

/** Pie `shape` override giving every slice a genuine extruded, puzzle-piece look (thick
 *  wedge, visible underside, white gap to its neighbors) instead of a flat/gradient-lit
 *  disc — modeled on classic isometric 3D pie charts. Draws each slice as TWO stacked
 *  `<Sector>`s sharing the exact same angles/radii: a darker one shifted straight down by
 *  `DONUT_3D_DEPTH` (the wedge's visible "side wall"), and the real one on top in the
 *  slice's own color with a `--card`-colored stroke (the "cut" separating it from its
 *  neighbors). Reads `fill` off `props` — the same value the chart's own per-slice
 *  `<Cell fill={...}>` already resolves — so no color list needs to be threaded through
 *  here; just pass `shape={donut3DShape}` to `<Pie>` and keep the existing `<Cell>`s. */
export function donut3DShape(props: PieSectorDataItem) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, cornerRadius } = props
  if (cx == null || cy == null || innerRadius == null || outerRadius == null || startAngle == null || endAngle == null || !fill) return <g />
  const dark = `color-mix(in oklch, ${fill} 60%, black 40%)`
  return (
    <g>
      <Sector
        cx={cx}
        cy={Number(cy) + DONUT_3D_DEPTH}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={cornerRadius}
        fill={dark}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        cornerRadius={cornerRadius}
        fill={fill}
        stroke="var(--card)"
        strokeWidth={1.5}
      />
    </g>
  )
}

/** Extrusion depth (px) for the isometric 3D bars below. */
export const BAR_3D_DEPTH = 7

interface Bar3DShapeProps {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
}

/** Bar `shape` override giving every bar a glossy isometric box look — a top face and a
 *  right-side face (light/dark tints of the bar's own color, same `color-mix` trick as
 *  `donut3DShape`) extruded up-and-right off a rounded front face, like a stack of solid
 *  3D blocks rather than a flat rect. Reads `fill` off `props`, same as `donut3DShape` —
 *  works with either a `<Bar fill=...>` or per-segment `<Cell fill=...>` children. Meant
 *  for one bar per category (or the outward-facing top segment of a stack); an inner
 *  stack segment shouldn't get this, or the extruded top/side faces show as a floating
 *  box in the middle of the stack instead of only at its visible outer edge. */
export function bar3DShape(props: Bar3DShapeProps) {
  const { x, y, width, height, fill } = props
  if (x == null || y == null || width == null || height == null || !fill || width <= 0 || height <= 0) return <g />
  const d = BAR_3D_DEPTH
  const light = `color-mix(in oklch, ${fill} 55%, white 45%)`
  const dark = `color-mix(in oklch, ${fill} 60%, black 40%)`
  const r = Math.min(5, width / 2, height / 2)
  return (
    <g>
      <polygon points={`${x + width},${y} ${x + width + d},${y - d} ${x + width + d},${y + height - d} ${x + width},${y + height}`} fill={dark} />
      <polygon points={`${x},${y} ${x + d},${y - d} ${x + width + d},${y - d} ${x + width},${y}`} fill={light} />
      <rect x={x} y={y} width={width} height={height} rx={r} ry={r} fill={fill} />
    </g>
  )
}

/** `<defs>` entry for the richer "3D" Area fill below — a brighter, glassier gradient
 *  (light-tinted top band easing through the base color into a deep, near-transparent
 *  tail) plus a soft drop-shadow filter so the filled curve reads with more depth than a
 *  flat top-to-bottom fade. Pass the returned ids to the `<Area>`'s `fill`/`filter`. */
export function Area3DDefs({ id, color }: { id: string; color: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={`color-mix(in oklch, ${color} 70%, white 30%)`} stopOpacity={0.9} />
        <stop offset="35%" stopColor={color} stopOpacity={0.55} />
        <stop offset="100%" stopColor={`color-mix(in oklch, ${color} 55%, black 45%)`} stopOpacity={0.08} />
      </linearGradient>
      <filter id={`${id}-glow`} x="-20%" y="-40%" width="140%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={color} floodOpacity="0.35" />
      </filter>
    </defs>
  )
}
