import * as THREE from 'three'
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg'

const smoothstep = (t) => t * t * (3 - 2 * t)

/**
 * One continuous, watertight body for a link that is thin at its start joint,
 * swells smoothly to a wide clevis end, and has a slot cut into that end.
 *
 *  1. Loft a rounded-rectangle cross-section along the whole link (round hubs
 *     at both joints included). Its height follows the curvy outline and its
 *     width eases from `tabW` to `forkW` between taperT0 and taperT1.
 *  2. Subtract a box (the slot) from the far end, leaving two prongs.
 *
 * Because it is a single solid, there are no internal faces or seams.
 *   length       joint-to-joint distance (hubs centred on x = 0 and x = length)
 *   r0, r1       hub radii; bulge swells (+) or pinches (-) the middle
 *   bevel        fillet radius of the long edges (also added to the outline)
 *   slotT        where the slot starts, as a fraction of length
 *   slotHalf     half the slot width (Z)
 */
export function buildForkedLink({
  length,
  r0,
  r1,
  bulge = 0,
  tabW,
  forkW,
  taperT0,
  taperT1,
  slotT,
  slotHalf,
  bevel = 0.05,
}) {
  const half = (t) => r0 + (r1 - r0) * smoothstep(t) + bulge * Math.sin(Math.PI * t) ** 2
  const R0 = r0 + bevel
  const R1 = r1 + bevel

  // Rings along x: round hub at the start, the body, round hub at the end.
  const stations = []
  const HUB = 18
  const BODY = 72
  for (let i = 0; i < HUB; i += 1) {
    const phi = (i / HUB) * (Math.PI / 2)
    stations.push({ x: -R0 * Math.cos(phi), H: R0 * Math.sin(phi) })
  }
  for (let i = 0; i <= BODY; i += 1) {
    const t = i / BODY
    stations.push({ x: length * t, H: half(t) + bevel })
  }
  for (let i = HUB - 1; i >= 0; i -= 1) {
    const phi = (i / HUB) * (Math.PI / 2)
    stations.push({ x: length + R1 * Math.cos(phi), H: R1 * Math.sin(phi) })
  }

  const widthAt = (x) => {
    const t = THREE.MathUtils.clamp(x / length, 0, 1)
    const s = smoothstep(THREE.MathUtils.clamp((t - taperT0) / (taperT1 - taperT0), 0, 1))
    return tabW + (forkW - tabW) * s
  }

  const C = 8 // points per rounded corner
  const ringPoints = ({ x, H }) => {
    const h = Math.max(H, 0.004)
    const w = widthAt(x) / 2
    const rc = Math.min(bevel, h * 0.999, w * 0.999)
    const pts = []
    const corners = [
      [w - rc, h - rc, 0],
      [-(w - rc), h - rc, Math.PI / 2],
      [-(w - rc), -(h - rc), Math.PI],
      [w - rc, -(h - rc), (3 * Math.PI) / 2],
    ]
    for (const [cz, cy, a0] of corners) {
      for (let k = 0; k <= C; k += 1) {
        const a = a0 + ((Math.PI / 2) * k) / C
        pts.push([x, cy + rc * Math.sin(a), cz + rc * Math.cos(a)])
      }
    }
    return pts
  }

  const rings = stations.map(ringPoints)
  const M = rings[0].length
  const positions = []
  const indices = []
  rings.forEach((ring) => ring.forEach((p) => positions.push(...p)))
  for (let i = 0; i < rings.length - 1; i += 1) {
    for (let j = 0; j < M; j += 1) {
      const a = i * M + j
      const b = i * M + ((j + 1) % M)
      indices.push(a, a + M, b, b, a + M, b + M)
    }
  }
  // Close the two tips with fans (own vertices, so the side normals stay smooth).
  ;[[0, false], [rings.length - 1, true]].forEach(([ri, flip]) => {
    const base = positions.length / 3
    positions.push(rings[ri][0][0], 0, 0)
    rings[ri].forEach((p) => positions.push(...p))
    for (let j = 0; j < M; j += 1) {
      const a = base + 1 + j
      const b = base + 1 + ((j + 1) % M)
      if (flip) indices.push(base, a, b)
      else indices.push(base, b, a)
    }
  })

  const loft = new THREE.BufferGeometry()
  loft.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  loft.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((positions.length / 3) * 2), 2))
  loft.setIndex(indices)
  loft.computeVertexNormals()

  // Slot: a box through the full height, open at the far end.
  const slotStart = length * slotT
  const slotLen = length - slotStart + R1 + 1
  const slotGeo = new THREE.BoxGeometry(slotLen, 4, slotHalf * 2)
  slotGeo.translate(slotStart + slotLen / 2, 0, 0)

  const body = new Brush(loft)
  const cutter = new Brush(slotGeo)
  body.updateMatrixWorld()
  cutter.updateMatrixWorld()
  const evaluator = new Evaluator()
  evaluator.attributes = ['position', 'normal']
  const result = evaluator.evaluate(body, cutter, SUBTRACTION)
  const geometry = result.geometry
  geometry.computeBoundingBox()
  return geometry
}
