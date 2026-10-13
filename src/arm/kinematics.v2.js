import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Arm geometry (scene units). Single source of truth for rendering AND math.
// ---------------------------------------------------------------------------
export const L1 = 2.0 // shoulder -> elbow
export const L2 = 1.8 // elbow -> wrist
export const L3 = 1.1 // wrist -> end of link 3 (the sleeve the rod slides in)
export const TOOL = 0.4 // rod/gripper length that always protrudes past link 3
export const EXT_MAX = 0.45 // extra linear travel of the rod
export const SHOULDER_Y = 1.35 // shoulder joint height above the base origin

// ---------------------------------------------------------------------------
// Homogeneous transforms (4x4). The arm is a yaw about Y followed by a planar
// chain in the local XY plane, every link running along its local +X axis:
//
//   T_tip = Ry(yaw) · Ty(SHOULDER_Y) · Rz(q1) · Tx(L1) · Rz(q2) · Tx(L2)
//           · Rz(q3) · Tx(L3 + TOOL + ext)
// ---------------------------------------------------------------------------
const Rz = (a) => new THREE.Matrix4().makeRotationZ(a)
const Ry = (a) => new THREE.Matrix4().makeRotationY(a)
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z)

export function forwardKinematics({ yaw, q1, q2, q3, ext }) {
  return new THREE.Matrix4()
    .multiply(Ry(yaw))
    .multiply(T(0, SHOULDER_Y, 0))
    .multiply(Rz(q1))
    .multiply(T(L1, 0, 0))
    .multiply(Rz(q2))
    .multiply(T(L2, 0, 0))
    .multiply(Rz(q3))
    .multiply(T(L3 + TOOL + ext, 0, 0))
}

/** World-space (base frame) tip position for a joint configuration. */
export function tipPosition(config) {
  return new THREE.Vector3().setFromMatrixPosition(forwardKinematics(config))
}

const clamp = THREE.MathUtils.clamp

// ---------------------------------------------------------------------------
// Collision model. Everything is checked in the arm's own vertical plane (the
// yaw rotation does not change distances because the base is axisymmetric), so
// each body is a 2D capsule (segment + radius) or a rectangle.
// ---------------------------------------------------------------------------
const MARGIN = 0.03 // extra clearance kept between bodies
const Q2_RANGE = [-2.5, 0] // elbow joint limit
const Q3_RANGE = [-1.6, 1.6] // wrist joint limit

// Base bodies as rectangles [xMin, xMax, yMax] (cross-section through the axis).
const BASE_BOXES = [
  [-1.7, 1.7, 0.3], // plinth
  [-1.2, 1.2, 0.5], // static race of the slewing ring
  [-1.03, 1.03, 0.65], // rotating race + toothed rim
  [-0.9, 0.9, 0.86], // turret column
]
const PIN_RADIUS = 0.4 // shoulder pin + caps, an obstacle for links 2 and 3

const segPointDist = (ax, ay, bx, by, px, py) => {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy || 1e-9
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Distance between two 2D segments (they either cross, or an endpoint is closest).
function segSegDist(a, b, c, d) {
  const o = (p, q, r) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  if (o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0) return 0
  return Math.min(
    segPointDist(a[0], a[1], b[0], b[1], c[0], c[1]),
    segPointDist(a[0], a[1], b[0], b[1], d[0], d[1]),
    segPointDist(c[0], c[1], d[0], d[1], a[0], a[1]),
    segPointDist(c[0], c[1], d[0], d[1], b[0], b[1]),
  )
}

// Does a capsule overlap a base rectangle (inflated by the capsule radius)?
function capsuleHitsBase(a, b, r) {
  const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.12))
  for (let i = 0; i <= n; i += 1) {
    const x = a[0] + ((b[0] - a[0]) * i) / n
    const y = a[1] + ((b[1] - a[1]) * i) / n
    if (y - r < MARGIN) return true // floor
    for (const [x0, x1, top] of BASE_BOXES) {
      if (x > x0 - r && x < x1 + r && y < top + r + MARGIN) return true
    }
  }
  return false
}

/** The capsules that make up the arm for a configuration, in the arm plane. */
export function armBodies({ q1, q2, q3, ext }) {
  const S = [0, SHOULDER_Y]
  const a2 = q1 + q2
  const a3 = a2 + q3
  const E = [S[0] + L1 * Math.cos(q1), S[1] + L1 * Math.sin(q1)]
  const W = [E[0] + L2 * Math.cos(a2), E[1] + L2 * Math.sin(a2)]
  const u = [Math.cos(a3), Math.sin(a3)]
  const at = (d) => [W[0] + d * u[0], W[1] + d * u[1]]
  const tool = L3 + TOOL + ext
  return {
    S,
    link1: { a: S, b: E, r: 0.45 },
    link2: { a: E, b: W, r: 0.36 },
    link3: { a: W, b: at(0.77), r: 0.3 },
    sleeve: { a: at(0.7), b: at(L3), r: 0.26 },
    rod: { a: at(L3), b: at(tool + 0.25), r: 0.2 },
  }
}

/** True if the configuration respects joint limits and no bodies overlap. */
export function isCollisionFree(config) {
  if (config.q2 < Q2_RANGE[0] || config.q2 > Q2_RANGE[1]) return false
  if (config.q3 < Q3_RANGE[0] || config.q3 > Q3_RANGE[1]) return false

  const { S, link1, link2, link3, sleeve, rod } = armBodies(config)
  const gap = (A, B) => segSegDist(A.a, A.b, B.a, B.b) - A.r - B.r < MARGIN

  // Every moving body against the base and floor.
  for (const body of [link1, link2, link3, sleeve, rod]) {
    if (capsuleHitsBase(body.a, body.b, body.r)) return false
  }
  // Links 2 and 3 against the shoulder pin / clevis.
  for (const body of [link2, link3, sleeve, rod]) {
    if (segPointDist(body.a[0], body.a[1], body.b[0], body.b[1], S[0], S[1]) - body.r < PIN_RADIUS) return false
  }
  // Non-adjacent links against each other.
  if (gap(link1, link3) || gap(link1, sleeve) || gap(link1, rod)) return false
  if (gap(link2, rod)) return false
  return true
}

// Planar 2-link IK for the wrist point (elbow-up). Returns null if the
// point is outside the annulus the two links can reach.
function twoLink(wx, wy) {
  const d = Math.hypot(wx, wy)
  const cosQ2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2)
  if (cosQ2 < -1 || cosQ2 > 1) return null
  const q2 = -Math.acos(cosQ2)
  const q1 = Math.atan2(wy, wx) - Math.atan2(L2 * Math.sin(q2), L1 + L2 * Math.cos(q2))
  return { q1, q2 }
}

// Fixed search grids: which poses are *allowed* depends only on the target, so
// a target that was solved once can always be solved again. The hint only
// changes the order in which candidates are tried.
const PHI_GRID = Array.from({ length: 29 }, (_, i) => -1.6 + 0.1 * i)
const EXT_GRID = Array.from({ length: 6 }, (_, i) => (EXT_MAX * i) / 5)

/**
 * Inverse kinematics: a joint configuration whose tip lands exactly on
 * `target` (Vector3, base frame), or null if no collision-free one exists.
 *
 *  1. yaw turns the arm plane toward the target.
 *  2. In that plane, candidates (approach angle `phi` of the end effector, rod
 *     extension) are tried best-first: closest to the previous pose (`hint`)
 *     so the arm doesn't flip between equivalent poses, with a mild pull
 *     toward a natural lean and a length that grows with distance.
 *  3. Two-link IK places the wrist, q3 matches phi, and the first candidate
 *     that passes isCollisionFree wins.
 */
export function inverseKinematics(target, hint) {
  const yaw = Math.atan2(-target.z, target.x)
  const r = Math.hypot(target.x, target.z)
  const h = target.y - SHOULDER_Y

  const phi0 = clamp(0.55 * Math.atan2(h, Math.max(r, 0.01)) - 0.3, -1.3, 0.9)
  const extPref = EXT_MAX * clamp((Math.hypot(r, h) - 2.6) / 2.4, 0, 1)
  const phiRef = hint ? hint.phi : phi0
  const extRef = hint ? 0.5 * hint.ext + 0.5 * extPref : extPref

  const candidates = []
  for (const phi of PHI_GRID) {
    for (const ext of EXT_GRID) {
      const cost = Math.abs(phi - phiRef) + 0.3 * Math.abs(phi - phi0) + 2 * Math.abs(ext - extRef)
      candidates.push({ phi, ext, cost })
    }
  }
  candidates.sort((a, b) => a.cost - b.cost)

  const minReach = Math.abs(L1 - L2) + 0.05
  const maxReach = L1 + L2 - 0.03

  for (const { phi, ext } of candidates) {
    const tool = L3 + TOOL + ext
    const wx = r - tool * Math.cos(phi)
    const wy = h - tool * Math.sin(phi)
    const d = Math.hypot(wx, wy)
    if (d < minReach || d > maxReach) continue
    const sol = twoLink(wx, wy)
    if (!sol) continue
    const config = { yaw, q1: sol.q1, q2: sol.q2, q3: phi - sol.q1 - sol.q2, ext }
    if (isCollisionFree(config)) return config
  }
  return null
}

const poseHint = (c) => (c ? { phi: c.q1 + c.q2 + c.q3, ext: c.ext } : undefined)

/**
 * Collision-aware target following. `lastSafe` is a target known to be
 * reachable. If `desired` is reachable it is used directly; otherwise a
 * bisection between the two finds the farthest reachable point along the way
 * (about 8 solves instead of a linear scan). Returns { config, target } or
 * null if even `lastSafe` can no longer be solved.
 */
export function solveSafe(desired, lastSafe, prevConfig) {
  const hint = poseHint(prevConfig)
  const direct = inverseKinematics(desired, hint)
  if (direct) return { config: direct, target: desired.clone() }

  let best = inverseKinematics(lastSafe, hint)
  if (!best) return null
  let bestTarget = lastSafe.clone()

  let lo = 0
  let hi = 1
  for (let i = 0; i < 8; i += 1) {
    const mid = (lo + hi) / 2
    const t = lastSafe.clone().lerp(desired, mid)
    const config = inverseKinematics(t, hint)
    if (config) {
      lo = mid
      best = config
      bestTarget = t
    } else {
      hi = mid
    }
  }
  return { config: best, target: bestTarget }
}
