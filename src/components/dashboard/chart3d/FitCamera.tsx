import { useMemo } from "react"
import { useThree } from "@react-three/fiber"
import { PerspectiveCamera } from "@react-three/drei"
import * as THREE from "three"

/** Every scene's camera distance was originally a fixed constant, tuned against one
 *  specific card size at 100% zoom — the moment a chart card is a different width, or the
 *  user's own on-card zoom stepper changes `--chart-h` (60%-160%), the container's actual
 *  pixel aspect ratio no longer matches what that constant assumed, and the framing breaks:
 *  content runs off the edges (reading as a thin diagonal "blade" instead of the intended
 *  shape) or sits tiny in the middle with every label consequently oversized relative to
 *  it. `FitCamera` computes the distance a perspective camera actually needs, from the
 *  live canvas pixel size (`useThree().size`, updated by R3F's own ResizeObserver) and the
 *  scene's known content half-extents, so every card size and zoom level frames correctly
 *  — the same job `ResponsiveContainer` does for the SVG charts elsewhere in this app. */
export function FitCamera({
  halfWidth,
  halfHeight,
  phi,
  theta,
  lookAt = [0, 0, 0],
  fov = 40,
  margin = 1.25,
}: {
  /** Half the content's extent along local X, in world units. */
  halfWidth: number
  /** Half the content's extent along local Y (height), in world units. */
  halfHeight: number
  /** Polar angle from vertical, radians — 0 is straight down, larger is more side-on. */
  phi: number
  /** Azimuth, radians. */
  theta: number
  lookAt?: [number, number, number]
  fov?: number
  margin?: number
}) {
  const { size } = useThree()

  const position = useMemo<[number, number, number]>(() => {
    const aspect = size.width / Math.max(1, size.height)
    const vFov = THREE.MathUtils.degToRad(fov)
    // Distance needed to fit the content vertically, and separately horizontally
    // (accounting for the canvas's own aspect ratio) — take whichever is larger so
    // nothing runs off either edge.
    const distForHeight = halfHeight / Math.tan(vFov / 2)
    const distForWidth = halfWidth / (Math.tan(vFov / 2) * aspect)
    const dist = Math.max(distForHeight, distForWidth) * margin
    const v = new THREE.Vector3().setFromSphericalCoords(dist, phi, theta)
    return [v.x + lookAt[0], v.y + lookAt[1], v.z + lookAt[2]]
  }, [size.width, size.height, halfWidth, halfHeight, phi, theta, lookAt, fov, margin])

  return <PerspectiveCamera makeDefault position={position} fov={fov} near={1} far={300} />
}
