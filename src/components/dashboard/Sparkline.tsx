import { useId } from "react"
import { useIsMobile } from "@/hooks/useIsMobile"

/** Tiny inline trend chart for a KPI tile. Mobile gets the richer bar treatment; desktop
 *  keeps the compact line used by the deployed dashboard. Deliberately not Recharts. */
export function Sparkline({
  data,
  width = 72,
  height = 24,
  color = "currentColor",
  responsive,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  /** Renders at width="100%" instead of a fixed pixel width, stretching to
   *  fill its container — width/height still define the viewBox's aspect
   *  ratio and point math, they just stop being the literal rendered size. */
  responsive?: boolean
}) {
  const gradientId = useId()
  const isMobile = useIsMobile()
  if (data.length < 2) return null

  if (!isMobile) {
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
      <svg
        width={responsive ? "100%" : width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
        aria-hidden="true"
      >
        <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
        <circle cx={lastX} cy={lastY} r={2} fill={color} />
      </svg>
    )
  }

  const max = Math.max(...data, 0.0001)
  const n = data.length
  const stepX = width / n
  const barWidth = Math.max(2, stepX * 0.56)
  const gap = (stepX - barWidth) / 2
  const topPad = 6
  const usableH = height - topPad
  // Pick out the peak bar (most recent occurrence if tied) as the "hero" bar — a
  // near-zero final period would otherwise make the highlight vanish.
  const peakIndex = data.reduce((best, v, i) => (v >= data[best] ? i : best), 0)

  function barPath(x: number, barH: number) {
    const y = height - barH
    const r = Math.min(barWidth / 2, barH / 2, 3.5)
    return `M${x},${height} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barWidth - r},${y} Q${x + barWidth},${y} ${x + barWidth},${y + r} L${x + barWidth},${height} Z`
  }

  const peakBarH = Math.max(2.5, (data[peakIndex] / max) * usableH)
  const dotX = peakIndex * stepX + gap + barWidth / 2
  const dotY = height - peakBarH

  return (
    <svg
      width={responsive ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.55} />
          <stop offset="100%" stopColor={color} stopOpacity={1} />
        </linearGradient>
      </defs>
      {data.map((v, i) => {
        const barH = Math.max(2.5, (v / max) * usableH)
        const x = i * stepX + gap
        const isPeak = i === peakIndex
        return <path key={i} d={barPath(x, barH)} fill={isPeak ? `url(#${gradientId})` : color} opacity={isPeak ? 1 : 0.32} />
      })}
      <circle cx={dotX} cy={dotY} r={5.5} fill={color} opacity={0.18} />
      <circle cx={dotX} cy={dotY} r={2.75} fill={color} stroke="var(--card)" strokeWidth={1.5} />
    </svg>
  )
}
