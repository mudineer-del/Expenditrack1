/** Tiny inline trend line for a KPI tile — last N period values, no axes/labels, just
 *  shape. Deliberately not a Recharts chart: this renders dozens of times per Dashboard
 *  load (one per KPI tile) and only needs a shape, not interactivity. */
export function Sparkline({
  data,
  width = 72,
  height = 24,
  color = "currentColor",
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
}) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const stepX = width / (data.length - 1)
  const pad = 2

  const points = data
    .map((v, i) => {
      const x = i * stepX
      const y = pad + (1 - (v - min) / range) * (height - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(" ")

  const last = data[data.length - 1]
  const lastX = (data.length - 1) * stepX
  const lastY = pad + (1 - (last - min) / range) * (height - pad * 2)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <circle cx={lastX} cy={lastY} r={2} fill={color} />
    </svg>
  )
}
