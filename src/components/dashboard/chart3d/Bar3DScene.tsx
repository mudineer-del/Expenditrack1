import { useMemo, useState } from "react"
import { Canvas, type ThreeEvent } from "@react-three/fiber"
import { Html, Line, OrbitControls, RoundedBox } from "@react-three/drei"
import * as THREE from "three"
import { resolveCssColor } from "./colorUtils"
import { Chart3DEmpty, Chart3DTooltip } from "./Chart3DShared"
import { FitCamera } from "./FitCamera"
import type { Chart3DDatum } from "./types"
import { useReduced3D } from "./useReduced3D"
import { useDisplayStore } from "@/store/useDisplayStore"

const MAX_HEIGHT = 20
const BAR_SIZE = 3.2
const GAP = 1.9

/** Bar-specific cap: unlike a donut's angle math, a zero-value bar is still meaningful (it
 *  legitimately means "nothing that period", distinct from a missing point), so this keeps
 *  zeros. Negative values disqualify the "fold the rest into Other" collapse — summing
 *  positives and negatives into one bucket would misrepresent both, so a mixed-sign series
 *  just gets truncated to `max` instead. */
function capBars(data: Chart3DDatum[], max: number, otherColor: string): Chart3DDatum[] {
  const finite = data.filter((d) => Number.isFinite(d.value))
  if (finite.length <= max) return finite
  if (finite.some((d) => d.value < 0)) return finite.slice(0, max)
  const head = finite.slice(0, max - 1)
  const rest = finite.slice(max - 1)
  return [...head, { key: "__other__", label: "Other", value: rest.reduce((s, d) => s + d.value, 0), color: otherColor, invoices: rest.flatMap((d) => d.invoices ?? []) }]
}

function Bar({
  d,
  x,
  height,
  width,
  depth,
  hovered,
  onHover,
  onUnhover,
  onClick,
  onMove,
}: {
  d: Chart3DDatum
  x: number
  height: number
  width: number
  depth: number
  hovered: boolean
  onHover: () => void
  onUnhover: () => void
  onClick: () => void
  onMove: (e: ThreeEvent<PointerEvent>) => void
}) {
  const color = useMemo(() => resolveCssColor(d.color), [d.color])
  const glow = useMemo(() => resolveCssColor(`color-mix(in oklch, ${d.color} 55%, white 45%)`), [d.color])
  const h = Math.max(0.12, Math.abs(height))
  const y = height >= 0 ? h / 2 : -h / 2
  const radius = Math.min(0.45, width / 4, h / 4)
  const lift = hovered ? 0.25 : 0
  const topFront: [number, number, number][] = [
    [x - width / 2 + radius, y + h / 2 + lift, depth / 2],
    [x + width / 2 - radius, y + h / 2 + lift, depth / 2],
  ]
  return (
    <group>
      <RoundedBox
        args={[width, h, depth]}
        radius={radius}
        smoothness={3}
        position={[x, y + lift, 0]}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover()
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          onUnhover()
        }}
        onPointerMove={onMove}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.28} emissive={color} emissiveIntensity={hovered ? 0.3 : 0.06} />
      </RoundedBox>
      {/* A bright glow line along the top-front edge — same "lit ridge" signature the 3D
          area chart uses — reads as a glossy highlight catching the key light. */}
      <Line points={topFront} color={glow} lineWidth={2} transparent opacity={hovered ? 1 : 0.75} />
    </group>
  )
}

export interface Bar3DSceneProps {
  data: Chart3DDatum[]
  otherColor: string
  formatValue: (v: number) => string
  onBarClick?: (d: Chart3DDatum) => void
  maxCategories?: number
}

/** Real WebGL 3D bar chart — extruded rounded boxes with camera tilt and soft shadows.
 *  Value height is always a direct, undistorted mapping of the data (only the box's
 *  depth/thickness responds to the "3D depth" setting), and the baseline stays fixed at
 *  y=0 so positive and negative values both read correctly. Vertical orientation only in
 *  this pass — see the chart's settings for "Reduce 3D effects". */
export function Bar3DScene({ data, otherColor, formatValue, onBarClick, maxCategories = 10 }: Bar3DSceneProps) {
  const depthSetting = useDisplayStore((s) => s.chart3DDepth)
  const tiltSetting = useDisplayStore((s) => s.chart3DTilt)
  const { depthScale, tiltScale, shadows } = useReduced3D()
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)

  const capped = useMemo(() => capBars(data, maxCategories, otherColor), [data, maxCategories, otherColor])
  const maxAbs = Math.max(...capped.map((d) => Math.abs(d.value)), 1)
  const depth = BAR_SIZE * 0.7 * depthSetting * depthScale

  const positions = useMemo(() => {
    const n = capped.length
    const totalWidth = n * (BAR_SIZE + GAP) - GAP
    const startX = -totalWidth / 2 + BAR_SIZE / 2
    return capped.map((_, i) => startX + i * (BAR_SIZE + GAP))
  }, [capped])

  const tiltDeg = Math.max(10, Math.min(75, tiltSetting * tiltScale))
  const phi = THREE.MathUtils.degToRad(90 - tiltDeg)
  // Bars are laid out along local X (see `positions`) — a theta near 90° points the
  // camera down that row rather than across it, crushing every bar toward one edge of the
  // frame. A small theta keeps the view mostly broadside, with just enough turn for the
  // extruded top/side faces to read as 3D.
  const theta = 0.34
  const totalWidth = capped.length * (BAR_SIZE + GAP)

  if (!capped.length) return <Chart3DEmpty message="No data to chart" />

  const hoveredIndex = capped.findIndex((d) => d.key === hoveredKey)
  const hoveredDatum = hoveredIndex >= 0 ? capped[hoveredIndex] : null

  return (
    <div className="relative h-full w-full">
      <Canvas shadows={shadows} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        <FitCamera halfWidth={totalWidth / 2 + 2} halfHeight={MAX_HEIGHT / 2 + 2} phi={phi} theta={theta} lookAt={[0, MAX_HEIGHT * 0.15, 0]} />
        <OrbitControls
          target={[0, MAX_HEIGHT * 0.15, 0]}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={THREE.MathUtils.degToRad(20)}
          maxPolarAngle={THREE.MathUtils.degToRad(85)}
          rotateSpeed={0.6}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[14, 24, 14]} intensity={1.15} castShadow={shadows} />
        <directionalLight position={[-10, 8, -8]} intensity={0.28} />
        {/* A tight, subtle shadow-catcher sized to the bar row itself — not a bright "stage
            floor" slab spanning the whole scene. */}
        <mesh position={[0, -0.02, depth * 0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[Math.max(positions.length * (BAR_SIZE + GAP) + 3, BAR_SIZE + 3), depth + 3]} />
          <meshStandardMaterial color="#000000" roughness={1} metalness={0} transparent opacity={0.16} />
        </mesh>
        {capped.map((d, i) => (
          <Bar
            key={d.key}
            d={d}
            x={positions[i]}
            width={BAR_SIZE}
            depth={depth}
            height={(d.value / maxAbs) * MAX_HEIGHT}
            hovered={hoveredKey === d.key}
            onHover={() => setHoveredKey(d.key)}
            onUnhover={() => setHoveredKey(null)}
            onClick={() => onBarClick?.(d)}
            onMove={(e) => setPointer({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })}
          />
        ))}
        {capped.map((d, i) => (
          <Html key={`lbl-${d.key}`} position={[positions[i], -0.6, depth / 2 + 0.4]} center distanceFactor={38} zIndexRange={[1, 0]}>
            <div className="pointer-events-none max-w-14 truncate text-center text-[10px] font-medium text-muted-foreground">{d.label}</div>
          </Html>
        ))}
      </Canvas>
      {hoveredDatum && pointer && (
        <Chart3DTooltip
          x={pointer.x}
          y={pointer.y}
          title={hoveredDatum.label}
          accent={resolveCssColor(hoveredDatum.color)}
          rows={[
            { label: "Value", value: formatValue(hoveredDatum.value) },
            { label: "Share of shown total", value: `${((hoveredDatum.value / (capped.reduce((s, d) => s + Math.max(0, d.value), 0) || 1)) * 100).toFixed(1)}%` },
          ]}
        />
      )}
    </div>
  )
}
