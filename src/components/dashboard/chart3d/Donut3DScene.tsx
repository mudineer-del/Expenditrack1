import { useMemo, useState } from "react"
import { Canvas, type ThreeEvent } from "@react-three/fiber"
import { Html, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { resolveCssColor } from "./colorUtils"
import { Chart3DEmpty, Chart3DLegend, Chart3DTooltip } from "./Chart3DShared"
import { FitCamera } from "./FitCamera"
import { capWithOther, type Chart3DDatum } from "./types"
import { useReduced3D } from "./useReduced3D"
import { useDisplayStore } from "@/store/useDisplayStore"

const SEGMENTS_PER_SLICE = 48

/** Straight-edged polygon approximation of an annulus sector (a donut wedge) in the local
 *  XY plane — extruded below into the actual 3D wedge. Built from line segments rather
 *  than `Shape.absarc` so the segment density (and so smoothness) is explicit and doesn't
 *  vary with the shape's radius. */
function ringSectorShape(innerR: number, outerR: number, startAngle: number, endAngle: number): THREE.Shape {
  const shape = new THREE.Shape()
  const segments = Math.max(2, Math.round((Math.abs(endAngle - startAngle) / (Math.PI * 2)) * SEGMENTS_PER_SLICE * 4))
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / segments
    const x = Math.cos(a) * outerR
    const y = Math.sin(a) * outerR
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  for (let i = segments; i >= 0; i--) {
    const a = startAngle + ((endAngle - startAngle) * i) / segments
    shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR)
  }
  shape.closePath()
  return shape
}

interface Slice {
  d: Chart3DDatum
  startAngle: number
  endAngle: number
  midAngle: number
  pct: number
}

function Wedge({
  slice,
  innerR,
  outerR,
  depth,
  exploded,
  hovered,
  onHover,
  onUnhover,
  onClick,
  onMove,
}: {
  slice: Slice
  innerR: number
  outerR: number
  depth: number
  exploded: boolean
  hovered: boolean
  onHover: () => void
  onUnhover: () => void
  onClick: () => void
  onMove: (e: ThreeEvent<PointerEvent>) => void
}) {
  const geometry = useMemo(() => {
    const shape = ringSectorShape(innerR, outerR, slice.startAngle, slice.endAngle)
    return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: Math.min(1.4, depth * 0.35), bevelSize: 1, bevelSegments: 2 })
  }, [innerR, outerR, slice.startAngle, slice.endAngle, depth])

  const explodeDist = exploded ? outerR * 0.12 : hovered ? outerR * 0.06 : 0
  const worldX = Math.cos(slice.midAngle) * explodeDist
  const worldZ = -Math.sin(slice.midAngle) * explodeDist
  const lift = hovered ? 1.6 : 0

  const color = useMemo(() => resolveCssColor(slice.d.color), [slice.d.color])

  return (
    <mesh
      geometry={geometry}
      position={[worldX, lift, worldZ]}
      rotation={[-Math.PI / 2, 0, 0]}
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
      <meshStandardMaterial
        color={color}
        metalness={0.18}
        roughness={0.48}
        emissive={color}
        emissiveIntensity={hovered ? 0.22 : 0.045}
      />
    </mesh>
  )
}

export interface Donut3DSceneProps {
  data: Chart3DDatum[]
  variant: "solid" | "exploded" | "semi"
  otherColor: string
  centerLabel?: { title: string; value: string }
  formatValue: (v: number) => string
  onSliceClick?: (d: Chart3DDatum) => void
  maxCategories?: number
}

/** Real WebGL 3D donut/pie — genuine extruded geometry with camera tilt, restrained
 *  virtual lighting (one key light upper-left, a soft fill light, ambient) and per-slice
 *  hover lift, rather than a flat SVG shape with a faked gradient. Three variants share
 *  this one scene: `solid` (classic beveled ring), `exploded` (permanent slice spacing),
 *  and `semi` (bottom half-circle "gauge" donut). */
export function Donut3DScene({ data, variant, otherColor, centerLabel, formatValue, onSliceClick, maxCategories = 7 }: Donut3DSceneProps) {
  const depthSetting = useDisplayStore((s) => s.chart3DDepth)
  const tiltSetting = useDisplayStore((s) => s.chart3DTilt)
  const labelsEnabled = useDisplayStore((s) => s.chartLabelsEnabled)
  const { depthScale, tiltScale, shadows } = useReduced3D()
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set())
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)

  const capped = useMemo(() => capWithOther(data, maxCategories, otherColor), [data, maxCategories, otherColor])
  const visible = useMemo(() => capped.filter((d) => !hiddenKeys.has(d.key)), [capped, hiddenKeys])
  const total = visible.reduce((s, d) => s + d.value, 0)

  const slices = useMemo<Slice[]>(() => {
    if (total <= 0) return []
    const sweep = variant === "semi" ? Math.PI : Math.PI * 2
    const start0 = variant === "semi" ? Math.PI : Math.PI / 2
    const direction = -1 // clockwise from 12 o'clock (or 9 o'clock for semi)
    let cursor = start0
    return visible.map((d) => {
      const span = (d.value / total) * sweep
      const startAngle = cursor
      const endAngle = cursor + direction * span
      cursor = endAngle
      return { d, startAngle, endAngle, midAngle: (startAngle + endAngle) / 2, pct: (d.value / total) * 100 }
    })
  }, [visible, total, variant])

  const depth = 4.5 * depthSetting * depthScale
  const innerR = 6.5
  const outerR = 11
  const tiltDeg = Math.max(8, Math.min(80, tiltSetting * tiltScale))

  // A "semi" ring only sweeps the upper half (angles 0..π), so its visual mass sits away
  // from the world origin instead of centered on it — orbiting the camera around [0,0,0]
  // like the full/exploded rings do points it at empty space next to the ring, crushing
  // everything (mesh and per-slice Html labels alike) toward one edge of the frustum. Look
  // at the half-ring's actual centroid instead, and pull back a bit further to fit it.
  const lookTarget = useMemo<[number, number, number]>(() => (variant === "semi" ? [0, 0, -outerR * 0.6] : [0, 0, 0]), [variant, outerR])

  // A half-ring reads best from more directly overhead than a full ring does — a larger
  // `tiltDeg` means a smaller `phi` (closer to top-down); an oblique, near-equatorial view
  // (small tiltDeg → large phi) foreshortens the arc hard enough that every slice's outer
  // label collapses toward the same spot on screen. Floor it high regardless of the user's
  // chosen tilt for a full/exploded ring.
  const effectiveTilt = variant === "semi" ? Math.max(tiltDeg, 62) : tiltDeg
  const phi = THREE.MathUtils.degToRad(90 - effectiveTilt)
  const theta = Math.PI / 3.4
  const camLookAt: [number, number, number] = [lookTarget[0], depth / 2 + lookTarget[1], lookTarget[2]]
  // Half-extent generous enough to include the outer per-slice labels (outerR + ~4).

  // Placing each label at its own slice's raw polar position (the original approach)
  // looked fine from directly overhead, but at the oblique tilt this scene actually uses,
  // the camera foreshortens the ring into a flattened ellipse — world angles that are
  // comfortably far apart (even the full ~51° spacing of 7 even slices) can still project
  // to nearly the same screen position near the ellipse's "equator", so labels ended up
  // overlapping the ring and each other regardless of how far out they were pushed
  // radially (visible on real well-cost data as an unreadable text pile-up over the
  // donut). Ported the SAME fix already proven out on the 2D SVG donut
  // (makeDonutOuterLabel in donut3d.tsx): bucket every label into a left/right lane by
  // which side of the ring its slice sits on, and stack each lane's labels along world Y
  // (this scene's true vertical axis — same axis centerLabel already floats on above the
  // ring) at even, guaranteed-non-overlapping steps, instead of trusting the raw
  // (foreshortened) polar projection to keep them apart.
  const sideLanes = useMemo(() => {
    const withSide = slices.map((s, i) => ({ i, side: (Math.cos(s.midAngle) >= 0 ? "right" : "left") as "left" | "right" }))
    const lanes = new Map<number, { rank: number; count: number; side: "left" | "right" }>()
    for (const side of ["left", "right"] as const) {
      const items = withSide.filter((item) => item.side === side)
      items.forEach((item, rank) => lanes.set(item.i, { rank, count: items.length, side }))
    }
    return lanes
  }, [slices])

  function toggleKey(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (!capped.length) return <Chart3DEmpty message="No data to chart" />

  const hoveredSlice = slices.find((s) => s.d.key === hoveredKey)

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative min-h-0 flex-1">
        <Canvas shadows={shadows} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
          {/* halfWidth/halfHeight need to clear the per-slice labels' lane positions
              (outerR + 8, further out now that labels sit in fixed side lanes rather than
              tight against the ring), plus a margin — Html labels are screen-space
              overlays, not world-clipped, so text can still run past the canvas edge in
              CSS pixels even when its anchor point is technically inside the frustum if
              that margin is too thin. */}
          <FitCamera halfWidth={outerR + 20} halfHeight={outerR + 14} phi={phi} theta={theta} lookAt={camLookAt} fov={38} />
          <OrbitControls
            target={camLookAt}
            enablePan={false}
            enableZoom={false}
            minPolarAngle={THREE.MathUtils.degToRad(15)}
            maxPolarAngle={THREE.MathUtils.degToRad(85)}
            rotateSpeed={0.6}
          />
          <ambientLight intensity={0.72} />
          <directionalLight position={[14, 22, 10]} intensity={0.95} castShadow={shadows} />
          <directionalLight position={[-10, 8, -8]} intensity={0.22} />
          {slices.map((s) => (
            <Wedge
              key={s.d.key}
              slice={s}
              innerR={innerR}
              outerR={outerR}
              depth={depth}
              exploded={variant === "exploded"}
              hovered={hoveredKey === s.d.key}
              onHover={() => setHoveredKey(s.d.key)}
              onUnhover={() => setHoveredKey(null)}
              onClick={() => onSliceClick?.(s.d)}
              onMove={(e) => setPointer({ x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })}
            />
          ))}
          {labelsEnabled &&
            slices
              .map((s, i) => ({ s, i }))
              .filter(({ s }) => s.pct >= 2)
              .map(({ s, i }) => {
                const lane = sideLanes.get(i)
                const side = lane?.side ?? (Math.cos(s.midAngle) >= 0 ? "right" : "left")
                const pushOut = outerR + 19
                const laneGap = 5.2
                const x = (side === "right" ? 1 : -1) * pushOut
                // Wedges extrude DOWN from y=0 (their top face sits at y=0, see Wedge's
                // -90°-about-X rotation) — y=0 is the ring's own surface, not clear of it,
                // so labels centered there sat right on top of the donut instead of beside
                // it. Float the whole lane above that surface first, then fan out from there.
                const y = 4.5 + (lane ? (lane.rank - (lane.count - 1) / 2) * laneGap : 0)
                return (
                  <Html key={`lbl-${s.d.key}`} position={[x, y, 0]} center distanceFactor={38} zIndexRange={[1, 0]}>
                    <div
                      className="pointer-events-none whitespace-nowrap text-[11px] font-bold drop-shadow-sm"
                      style={{ color: resolveCssColor(s.d.color) }}
                    >
                      {s.d.label} ({Math.round(s.pct)}%)
                    </div>
                  </Html>
                )
              })}
          {centerLabel && (
            <Html center position={[0, depth + 0.6, 0]} zIndexRange={[1, 0]}>
              <div className="pointer-events-none flex flex-col items-center text-center">
                <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{centerLabel.title}</div>
                <div className="text-sm font-bold text-foreground">{centerLabel.value}</div>
              </div>
            </Html>
          )}
        </Canvas>
        {hoveredSlice && pointer && (
          <Chart3DTooltip
            x={pointer.x}
            y={pointer.y}
            title={hoveredSlice.d.label}
            accent={resolveCssColor(hoveredSlice.d.color)}
            rows={[
              { label: "Value", value: formatValue(hoveredSlice.d.value) },
              { label: "Share", value: `${hoveredSlice.pct.toFixed(1)}%` },
              ...(slices.length > 1
                ? [
                    {
                      label: "vs. largest",
                      value: (() => {
                        const max = Math.max(...slices.map((s) => s.d.value))
                        if (hoveredSlice.d.value >= max) return "Largest"
                        const diff = ((hoveredSlice.d.value - max) / max) * 100
                        return `${diff.toFixed(0)}%`
                      })(),
                    },
                  ]
                : []),
            ]}
          />
        )}
      </div>
      <Chart3DLegend
        items={capped.map((d) => ({ key: d.key, label: d.label, color: d.color }))}
        hidden={hiddenKeys}
        onToggle={toggleKey}
      />
    </div>
  )
}
