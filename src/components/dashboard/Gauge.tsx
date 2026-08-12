import type { ReactNode } from "react"
import { useDisplayStore } from "@/store/useDisplayStore"

const GAUGE_SCALE: Record<string, number> = { compact: 0.82, comfortable: 1, spacious: 1.18 }

/** Ported from buildSpeedoGauge (index.html:2322-2368). */
export function Gauge({ pct, hubText, hubLabel }: { pct: number; hubText: string; hubLabel: string }) {
  const cardScale = useDisplayStore((s) => s.cardScale)
  const scale = GAUGE_SCALE[cardScale] ?? 1
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0))
  const cx = 110
  const cy = 110
  const rOuter = 96
  const rTickOuter = 88
  const rTickInner = 78
  const rNum = 64
  const needleLen = 68
  const startDeg = 135
  const sweepDeg = 270

  const pt = (r: number, deg: number): [number, number] => {
    const rad = (deg * Math.PI) / 180
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)]
  }
  const arcPath = (r: number, d0: number, d1: number) => {
    const [x0, y0] = pt(r, d0)
    const [x1, y1] = pt(r, d1)
    const large = d1 - d0 > 180 ? 1 : 0
    return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
  }

  const zones = [
    { from: 0, to: 50, color: "#c23b3b" },
    { from: 50, to: 80, color: "#c8781c" },
    { from: 80, to: 100, color: "#1c8a4b" },
  ]
  const zoneArcs = zones.map((z) => {
    const d0 = startDeg + sweepDeg * (z.from / 100)
    const d1 = startDeg + sweepDeg * (z.to / 100)
    return (
      <path
        key={z.from}
        d={arcPath(rOuter, d0, d1)}
        stroke={z.color}
        strokeWidth={9}
        fill="none"
        strokeLinecap="butt"
        opacity={0.85}
      />
    )
  })

  const ticks: ReactNode[] = []
  for (let v = 0; v <= 100; v += 10) {
    const deg = startDeg + sweepDeg * (v / 100)
    const [x0, y0] = pt(rTickOuter, deg)
    const [x1, y1] = pt(rTickInner, deg)
    const isMajor = v % 20 === 0
    ticks.push(
      <line
        key={`t${v}`}
        x1={x0.toFixed(2)}
        y1={y0.toFixed(2)}
        x2={x1.toFixed(2)}
        y2={y1.toFixed(2)}
        stroke="#5f5c54"
        strokeWidth={isMajor ? 2.4 : 1.4}
      />
    )
    if (isMajor) {
      const [nx, ny] = pt(rNum, deg)
      ticks.push(
        <text
          key={`n${v}`}
          x={nx.toFixed(2)}
          y={(ny + 4).toFixed(2)}
          fontSize={12}
          fontWeight={700}
          fill="#43413c"
          textAnchor="middle"
          fontFamily="sans-serif"
        >
          {v}
        </text>
      )
    }
  }

  const needleDeg = startDeg + sweepDeg * (clamped / 100)
  const [nTipX, nTipY] = pt(needleLen, needleDeg)
  const [nTailX, nTailY] = pt(14, needleDeg + 180)
  const needleColor = clamped >= 80 ? "#1c8a4b" : clamped >= 50 ? "#c8781c" : "#c23b3b"

  return (
    <svg
      viewBox="0 0 220 190"
      width={220 * scale}
      height={190 * scale}
      style={{ display: "block", margin: "0 auto" }}
    >
      <circle cx={cx} cy={cy} r={rOuter + 8} fill="#fbfaf7" stroke="#e2ded6" strokeWidth={1.5} />
      {zoneArcs}
      {ticks}
      <line
        x1={nTailX.toFixed(2)}
        y1={nTailY.toFixed(2)}
        x2={nTipX.toFixed(2)}
        y2={nTipY.toFixed(2)}
        stroke={needleColor}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={24} fill="#fff" stroke={needleColor} strokeWidth={2.5} />
      <text x={cx} y={cy - 2} fontSize={15} fontWeight={700} fill="#0a2540" textAnchor="middle" fontFamily="sans-serif">
        {hubText}
      </text>
      <text
        x={cx}
        y={cy + 13}
        fontSize={8.5}
        fontWeight={700}
        fill="#8a8880"
        textAnchor="middle"
        fontFamily="sans-serif"
        letterSpacing={0.5}
      >
        {hubLabel}
      </text>
    </svg>
  )
}
