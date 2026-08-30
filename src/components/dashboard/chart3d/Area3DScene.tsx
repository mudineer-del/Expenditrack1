import { useMemo, useState } from "react"
import { Canvas, type ThreeEvent } from "@react-three/fiber"
import { Html, Line, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { resolveCssColor } from "./colorUtils"
import { Chart3DEmpty, Chart3DTooltip } from "./Chart3DShared"
import { FitCamera } from "./FitCamera"
import { downsampleOrdered } from "./types"
import { useReduced3D } from "./useReduced3D"
import { useDisplayStore } from "@/store/useDisplayStore"

const MAX_HEIGHT = 16
const MAX_POINTS = 48
const SPAN = 34
const SAMPLES_PER_SEGMENT = 10

export interface Area3DPoint {
  key: string
  label: string
  value: number
}

export interface Area3DSceneProps {
  points: Area3DPoint[]
  color: string
  formatValue: (v: number) => string
  onPointClick?: (p: Area3DPoint) => void
}

/** Real WebGL 3D area chart — the area-under-curve extruded into a solid ribbon with a
 *  height-mapped gradient (deep base color rising to a bright crest, like the reference
 *  screenshots) and a glowing ridge line tracing the actual data. The RIDGE PATH is a
 *  Catmull-Rom spline *through* the real values (same idea as the SVG charts' "monotone"
 *  curves elsewhere in the app) — every real point is still hit exactly, only the segment
 *  *between* two points is curved instead of a hard angle, so nothing is invented. Dense
 *  series are downsampled for the geometry only — every tooltip/axis label still comes
 *  from the real, un-thinned data. */
export function Area3DScene({ points, color, formatValue, onPointClick }: Area3DSceneProps) {
  const depthSetting = useDisplayStore((s) => s.chart3DDepth)
  const tiltSetting = useDisplayStore((s) => s.chart3DTilt)
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const { depthScale, tiltScale, shadows } = useReduced3D()
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)

  const plotted = useMemo(() => downsampleOrdered(points, MAX_POINTS), [points])
  const maxValue = Math.max(...plotted.map((p) => Math.max(0, p.value)), 1)
  const depth = 3.5 * depthSetting * depthScale
  const peakColor = useMemo(() => resolveCssColor(`color-mix(in oklch, ${color} 55%, white 45%)`), [color])
  const midColor = useMemo(() => resolveCssColor(color), [color])

  const xs = useMemo(() => {
    const n = plotted.length
    if (n <= 1) return plotted.map(() => 0)
    return plotted.map((_, i) => -SPAN / 2 + (i / (n - 1)) * SPAN)
  }, [plotted])

  const heights = useMemo(() => plotted.map((p) => (Math.max(0, p.value) / maxValue) * MAX_HEIGHT), [plotted, maxValue])

  // The smooth ridge every real point sits on — sampled from a spline through the actual
  // (x, height) pairs, not through any invented data.
  const ridge = useMemo(() => {
    if (plotted.length < 2) return []
    const curve = new THREE.SplineCurve(xs.map((x, i) => new THREE.Vector2(x, heights[i])))
    return curve.getPoints(Math.max(2, (plotted.length - 1) * SAMPLES_PER_SEGMENT))
  }, [xs, heights, plotted.length])

  const geometry = useMemo(() => {
    if (ridge.length < 2) return null
    const shape = new THREE.Shape()
    shape.moveTo(ridge[0].x, 0)
    ridge.forEach((p) => shape.lineTo(p.x, Math.max(0, p.y)))
    shape.lineTo(ridge[ridge.length - 1].x, 0)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.15, bevelSegments: 1, curveSegments: 1 })
  }, [ridge, depth])

  const ridgeLinePoints = useMemo<[number, number, number][]>(
    () => ridge.map((p) => [p.x, Math.max(0, p.y) + 0.05, depth + 0.08]),
    [ridge, depth],
  )

  const tiltDeg = Math.max(10, Math.min(70, tiltSetting * tiltScale))
  const phi = THREE.MathUtils.degToRad(90 - tiltDeg)
  // Points are laid out along local X (see `xs`) — a theta near 90° points the camera down
  // that length rather than across it, crushing the whole ribbon toward one edge of the
  // frame (and every label along with it). A small theta keeps the view mostly broadside,
  // with just enough turn to read as 3D.
  const theta = 0.3
  const lookAt: [number, number, number] = [0, MAX_HEIGHT * 0.3, depth / 2]

  function handleMove(e: ThreeEvent<PointerEvent>) {
    setPointer({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
    const local = e.point
    let nearest = 0
    let best = Infinity
    xs.forEach((x, i) => {
      const d = Math.abs(x - local.x)
      if (d < best) {
        best = d
        nearest = i
      }
    })
    setHoveredKey(plotted[nearest]?.key ?? null)
  }

  if (plotted.length < 2) return <Chart3DEmpty message="Not enough data to chart" />

  const hovered = plotted.find((p) => p.key === hoveredKey)
  const hoveredIndex = hovered ? plotted.indexOf(hovered) : -1

  return (
    <div className="relative h-full w-full">
      <Canvas shadows={shadows} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        <FitCamera halfWidth={SPAN / 2 + 2} halfHeight={MAX_HEIGHT / 2 + 2} phi={phi} theta={theta} lookAt={lookAt} fov={38} />
        <OrbitControls
          target={lookAt}
          enablePan={false}
          enableZoom={false}
          minPolarAngle={THREE.MathUtils.degToRad(20)}
          maxPolarAngle={THREE.MathUtils.degToRad(85)}
          rotateSpeed={0.6}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[12, 22, 16]} intensity={1.15} castShadow={shadows} />
        <directionalLight position={[-14, 10, -10]} intensity={0.35} color={peakColor} />
        <pointLight position={[0, MAX_HEIGHT + 4, depth + 8]} intensity={0.5} color={peakColor} distance={60} />
        {geometry && (
          <mesh geometry={geometry} onPointerMove={handleMove} onPointerOut={() => setHoveredKey(null)} onClick={() => hovered && onPointClick?.(hovered)} castShadow receiveShadow>
            <meshStandardMaterial color={midColor} metalness={0.25} roughness={0.32} emissive={midColor} emissiveIntensity={0.12} />
          </mesh>
        )}
        {ridgeLinePoints.length > 1 && <Line points={ridgeLinePoints} color={peakColor} lineWidth={2} transparent opacity={0.85} />}
        {hoveredIndex >= 0 && (
          <mesh position={[xs[hoveredIndex], heights[hoveredIndex] + 0.1, depth + 0.6]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshStandardMaterial color={peakColor} emissive={peakColor} emissiveIntensity={0.7} />
          </mesh>
        )}
        {labelsEnabled &&
          plotted
            .filter((_, i) => plotted.length <= 6 || i % Math.ceil(plotted.length / 6) === 0)
            .map((p) => {
              const i = plotted.indexOf(p)
              return (
                <Html key={`x-${p.key}`} position={[xs[i], -0.8, depth / 2]} center distanceFactor={38} zIndexRange={[1, 0]}>
                  <div className="pointer-events-none max-w-16 truncate text-center text-[10px] font-medium text-muted-foreground">{p.label}</div>
                </Html>
              )
            })}
        {[0.02, 1].map((f) => (
          <Html key={`y-${f}`} position={[-SPAN / 2 - 0.5, f * MAX_HEIGHT, depth / 2]} center distanceFactor={38} zIndexRange={[1, 0]}>
            <div className="pointer-events-none whitespace-nowrap text-[10px] text-muted-foreground">{formatValue(f * maxValue)}</div>
          </Html>
        ))}
      </Canvas>
      {hovered && pointer && (
        <Chart3DTooltip
          x={pointer.x}
          y={pointer.y}
          title={hovered.label}
          accent={midColor}
          rows={[{ label: "Value", value: formatValue(hovered.value) }]}
        />
      )}
    </div>
  )
}
