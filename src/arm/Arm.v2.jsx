import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import {
  L1,
  L2,
  L3,
  TOOL,
  SHOULDER_Y,
  isCollisionFree,
  solveSafe,
} from './kinematics.v2.js'
import { buildForkedLink } from './link2.v2.js'

// World placement of the arm base and the plane the cursor is projected onto.
// The plane sits slightly in front of the base so the turret visibly yaws as
// the cursor moves left/right instead of the arm being locked to one plane.
// The base's height is recomputed every frame (see placeBase) so the gap under
// the base matches the gap above the page title at any window size.
const BASE = new THREE.Vector3(0, -2.6, 0)
const MIN_TARGET_Y = 0.4
const EXT_VISUAL = 0.5 // fraction of the solved rod extension that is actually drawn
// The arm is drawn at ARM_SCALE of its original on-screen size by pulling the
// camera back (placeBase and the cursor ray both follow the camera).
const ARM_SCALE = 0.85
const CAMERA = { position: [0, 0.4, 12.5 / ARM_SCALE], fov: 34 }
const PLINTH_RADIUS = 1.7 // front edge of the base, used to find its lowest screen pixel
const CURSOR_PLANE_Z = 1.0
// The tip never goes all the way to the cursor: it stops CURSOR_OFFSET short, on
// the line from the shoulder to the cursor, so the arm stays out of the bubbles.
const CURSOR_OFFSET = 1.5
const MIN_REACH = 1.5 // never pull the target closer to the shoulder than this
const TWIRL_RATE = 9 // damping of the click twirl (higher = snappier)
const REST_TARGET = new THREE.Vector3(3.2, 1.6, CURSOR_PLANE_Z) // where the arm waits before the cursor moves

const damp = THREE.MathUtils.damp

// Satin aluminum: metallic sheen, but rough/diffuse enough that it never goes
// black or mirror-bright as the arm turns.
const silver = { color: '#e4e9ef', metalness: 0.75, roughness: 0.3 }
// Links: darker anodized blue-grey so the aluminum joints read as separate parts.
const linkMat = { color: '#62748f', metalness: 0.5, roughness: 0.42 }
const baseMat = { color: '#3a465c', metalness: 0.45, roughness: 0.5 }

// Top margin of the page title ("md:top-12" / "top-6" in App.v2.jsx), in px.
const titleTopMargin = () => (window.matchMedia('(min-width: 768px)').matches ? 48 : 24)

// Lowers/raises BASE so the base's lowest screen pixel sits one title-margin
// above the bottom of the page. The camera looks straight down -Z, so a point
// at depth z lands at NDC y = (y - camY) / ((camZ - z) * tan(fov / 2)).
function placeBase(height) {
  const margin = titleTopMargin()
  const ndcY = -(1 - (2 * margin) / height)
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))
  const [, camY, camZ] = CAMERA.position
  BASE.y = camY + ndcY * (camZ - PLINTH_RADIUS) * tanHalf
}

// Tapered, curvy link whose two round hubs are centred on its joints (x = 0
// and x = length), so the pins sit inside the link instead of at its edge.
//   r0, r1  hub radii at the start / end joint
//   bulge   >0 swells the middle (heavy link), <0 pinches it (slender waist)
// The outline uses sin^2 for the bulge so it meets the hubs with a horizontal
// tangent: no kinks.
//
// A link is built from `sections`, each a slice of the outline [t0, t1]
// (0 = start joint, 1 = end joint) extruded to its own thickness at its own
// z offset. Stacking a thick slab with two thin, offset prongs makes a clevis:
// the slot between the prongs is where the next link's thin tab sits.
// `thickness` is the finished width in Z (bevels included).
const BEVEL = 0.05
const smoothstep = (t) => t * t * (3 - 2 * t)

function sectionGeometry({ length, r0, r1, bulge }, { t0, t1, thickness }) {
  const half = (t) => r0 + (r1 - r0) * smoothstep(t) + bulge * Math.sin(Math.PI * t) ** 2
  const steps = Math.max(2, Math.round(48 * (t1 - t0)))
  const x = (t) => length * t
  const shape = new THREE.Shape()
  shape.moveTo(x(t0), half(t0))
  for (let i = 1; i <= steps; i += 1) {
    const t = t0 + ((t1 - t0) * i) / steps
    shape.lineTo(x(t), half(t))
  }
  if (t1 >= 1) shape.absarc(length, 0, r1, Math.PI / 2, -Math.PI / 2, true)
  else shape.lineTo(x(t1), -half(t1))
  for (let i = steps - 1; i >= 0; i -= 1) {
    const t = t0 + ((t1 - t0) * i) / steps
    shape.lineTo(x(t), -half(t))
  }
  if (t0 <= 0) shape.absarc(0, 0, r0, -Math.PI / 2, -(3 * Math.PI) / 2, true)
  const depth = thickness - 2 * BEVEL
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: BEVEL,
    bevelThickness: BEVEL,
    bevelSegments: 6,
    curveSegments: 48,
  })
  geometry.translate(0, 0, -depth / 2)
  return geometry
}

function SmoothLink({ length, r0, r1, bulge = 0, sections, material = linkMat }) {
  const outline = { length, r0, r1, bulge }
  return (
    <>
      {sections.map((section, i) => (
        <mesh
          key={i}
          castShadow
          position={[0, 0, section.z ?? 0]}
          geometry={sectionGeometry(outline, section)}
        >
          <meshStandardMaterial {...material} />
        </mesh>
      ))}
    </>
  )
}

// Clevis layout shared by the elbow and wrist: outer width, prong width, and
// the resulting slot, which the next link's thin tab must fit inside.
const FORK_W = 0.72 // overall width of a forked end (prongs outer faces)
const PRONG_W = 0.17 // width of each prong
const TAB_W = 0.34 // width of the tab that sits in the slot (slot = 0.38)
const prongZ = (FORK_W - PRONG_W) / 2

// Link 2 is one solid body: thin at the elbow, easing out to the fork width,
// with the wrist slot cut from it (see link2.v2.js).
const link2Geometry = buildForkedLink({
  length: L2,
  r0: 0.28,
  r1: 0.22,
  bulge: -0.09,
  tabW: TAB_W,
  forkW: FORK_W,
  taperT0: 0.28,
  taperT1: 0.74,
  slotT: 0.74,
  slotHalf: (FORK_W - 2 * PRONG_W) / 2,
  bevel: BEVEL,
})

// Robotic joint actuator, drawn on one face of a joint. Built outward along
// local +Y from the face (the parent rotates it onto the Z axis):
//   flange (silver) with a ring of bolts -> dark motor housing with a seam
//   groove -> silver output hub -> dark centre cap.
const actuatorDark = { color: '#252e3f', metalness: 0.55, roughness: 0.4 }
const boltMat = { color: '#9aa5b4', metalness: 0.8, roughness: 0.35 }
const BOLTS = 8

function Actuator({ R, side }) {
  const bolts = Array.from({ length: BOLTS }, (_, i) => (i / BOLTS) * Math.PI * 2)
  return (
    <group scale={[1, side, 1]}>
      {/* Mounting flange + bolt circle */}
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[R, R, 0.06, 64]} />
        <meshStandardMaterial {...silver} />
      </mesh>
      {bolts.map((a) => (
        <mesh key={a} position={[Math.cos(a) * R * 0.84, 0.07, Math.sin(a) * R * 0.84]}>
          <cylinderGeometry args={[R * 0.06, R * 0.06, 0.03, 12]} />
          <meshStandardMaterial {...boltMat} />
        </mesh>
      ))}
      {/* Motor housing, with a thin seam groove */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[R * 0.7, R * 0.72, 0.12, 64]} />
        <meshStandardMaterial {...actuatorDark} />
      </mesh>
      <mesh position={[0, 0.125, 0]}>
        <cylinderGeometry args={[R * 0.735, R * 0.735, 0.015, 64]} />
        <meshStandardMaterial color="#0f1522" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Output hub and centre cap */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[R * 0.44, R * 0.46, 0.06, 48]} />
        <meshStandardMaterial {...silver} />
      </mesh>
      <mesh position={[0, 0.245, 0]}>
        <cylinderGeometry args={[R * 0.2, R * 0.2, 0.04, 32]} />
        <meshStandardMaterial {...actuatorDark} />
      </mesh>
    </group>
  )
}

// Pin joint along Z: a through-pin with an actuator module on each side.
function PinJoint({ radius, span, cap }) {
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, span, 64]} />
        <meshStandardMaterial {...silver} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[0, side * (span / 2), 0]}>
          <Actuator R={cap} side={side} />
        </group>
      ))}
    </group>
  )
}

// Fixed base: wide plinth, a column, and a clevis (two parallel ears) that
// the shoulder pin passes through. Link 1 sits between the ears.
function BasePedestal({ yawRef, children }) {
  const EAR_Z = 0.5 // distance of each ear from the centre plane
  return (
    <>
      <mesh castShadow receiveShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[1.5, 1.7, 0.3, 64]} />
        <meshStandardMaterial {...baseMat} />
      </mesh>
      {/* Slewing-ring bearing. Static outer race bolted to the plinth... */}
      <mesh castShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.12, 1.2, 0.2, 96]} />
        <meshStandardMaterial {...silver} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2
        return (
          <mesh key={`sb${i}`} position={[Math.cos(a) * 1.055, 0.51, Math.sin(a) * 1.055]}>
            <cylinderGeometry args={[0.035, 0.035, 0.03, 12]} />
            <meshStandardMaterial {...boltMat} />
          </mesh>
        )
      })}
      {/* ...a dark seal / raceway gap, so the two races read as separate parts... */}
      <mesh position={[0, 0.515, 0]}>
        <cylinderGeometry args={[0.99, 0.99, 0.03, 96]} />
        <meshStandardMaterial color="#0f1522" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* ...and the rotating inner race, with a toothed rim, carrying the turret. */}
      <group ref={yawRef} position={[0, 0.46, 0]}>
        <mesh castShadow position={[0, 0.13, 0]}>
          <cylinderGeometry args={[0.98, 0.98, 0.12, 96]} />
          <meshStandardMaterial {...silver} />
        </mesh>
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2
          return (
            <mesh
              key={`tooth${i}`}
              position={[Math.cos(a) * 1.0, 0.13, Math.sin(a) * 1.0]}
              rotation={[0, -a, 0]}
            >
              <boxGeometry args={[0.06, 0.1, 0.06]} />
              <meshStandardMaterial {...silver} />
            </mesh>
          )
        })}
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((i + 0.5) / 10) * Math.PI * 2
          return (
            <mesh key={`rb${i}`} position={[Math.cos(a) * 0.9, 0.2, Math.sin(a) * 0.9]}>
              <cylinderGeometry args={[0.035, 0.035, 0.03, 12]} />
              <meshStandardMaterial {...boltMat} />
            </mesh>
          )
        })}
        <mesh castShadow position={[0, 0.295, 0]}>
          <cylinderGeometry args={[0.78, 0.84, 0.21, 64]} />
          <meshStandardMaterial {...baseMat} />
        </mesh>
        {/* Clevis ears rising to the shoulder pin */}
        {[-1, 1].map((side) => (
          <mesh key={side} castShadow position={[0, 0.4 + (SHOULDER_Y - 0.46 - 0.4) / 2, side * EAR_Z]}>
            <boxGeometry args={[0.9, SHOULDER_Y - 0.46 - 0.4, 0.22]} />
            <meshStandardMaterial {...baseMat} />
          </mesh>
        ))}
        {/* Rounded ear tops hugging the pin */}
        {[-1, 1].map((side) => (
          <mesh key={`top${side}`} castShadow position={[0, SHOULDER_Y - 0.46, side * EAR_Z]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.22, 48]} />
            <meshStandardMaterial {...baseMat} />
          </mesh>
        ))}
        {/* Shoulder pin spans both ears */}
        <group position={[0, SHOULDER_Y - 0.46, 0]}>{children}</group>
      </group>
    </>
  )
}

function ArmRig({ paused, pointer }) {
  const yawRef = useRef()
  const j1 = useRef()
  const j2 = useRef()
  const j3 = useRef()
  const rodRef = useRef()
  const gripRef = useRef()
  const cfg = useRef(null)
  const lastSafe = useRef(REST_TARGET.clone())
  const twirl = useRef({ angle: 0, target: 0, handled: 0 })

  const groupRef = useRef()

  useFrame(({ camera, size }, dt) => {
    placeBase(size.height)
    groupRef.current.position.copy(BASE)
    if (paused) return
    const step = Math.min(dt, 0.05)

    // 1. Cursor (NDC) -> ray -> intersection with the vertical plane z = BASE.z + CURSOR_PLANE_Z.
    //    Before the cursor has moved, or if it leaves the page, the arm simply holds.
    const desired = new THREE.Vector3()
    const p = pointer.current
    if (p.seen) {
      const ray = new THREE.Vector3(p.x, p.y, 0.5).unproject(camera).sub(camera.position).normalize()
      const planeZ = BASE.z + CURSOR_PLANE_Z
      const k = (planeZ - camera.position.z) / ray.z
      desired.copy(camera.position).addScaledVector(ray, k).sub(BASE)
      // Pull the target back toward the shoulder by CURSOR_OFFSET (plain offset, no collision logic).
      const shoulder = new THREE.Vector3(0, SHOULDER_Y, 0)
      const toCursor = desired.clone().sub(shoulder)
      const reach = Math.max(toCursor.length() - CURSOR_OFFSET, MIN_REACH)
      desired.copy(shoulder).addScaledVector(toCursor.normalize(), reach)
      desired.y = Math.max(desired.y, MIN_TARGET_Y) // keep the target out of the floor
    } else {
      desired.copy(lastSafe.current)
    }

    // 2. Target -> joint configuration. solveSafe walks from the last reachable
    //    target toward the cursor and stops at the farthest collision-free point.
    const solved = solveSafe(desired, lastSafe.current, cfg.current)
    const goal = solved?.config
    if (solved) {
      lastSafe.current.copy(solved.target)
    }

    // 3. Ease toward the solution; yaw takes the short way around. The step is
    //    shortened if the intermediate pose would hit something (anticipation).
    const c = (cfg.current ??= goal ? { ...goal } : null)
    if (!c) return
    if (goal) {
      let dyaw = goal.yaw - c.yaw
      dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw))
      const next = {
        yaw: c.yaw + dyaw * (1 - Math.exp(-6 * step)),
        q1: damp(c.q1, goal.q1, 7, step),
        q2: damp(c.q2, goal.q2, 7, step),
        q3: damp(c.q3, goal.q3, 7, step),
        ext: damp(c.ext, goal.ext, 6, step),
      }
      for (const f of [1, 0.5, 0.25, 0.1]) {
        const trial = {
          yaw: c.yaw + (next.yaw - c.yaw) * f,
          q1: c.q1 + (next.q1 - c.q1) * f,
          q2: c.q2 + (next.q2 - c.q2) * f,
          q3: c.q3 + (next.q3 - c.q3) * f,
          ext: c.ext + (next.ext - c.ext) * f,
        }
        if (isCollisionFree(trial)) {
          Object.assign(c, trial)
          break
        }
      }
    }

    // 4. Apply to the scene graph. Each group's rotation is one factor in the
    //    forward-kinematics matrix product.
    yawRef.current.rotation.y = c.yaw
    j1.current.rotation.z = c.q1
    j2.current.rotation.z = c.q2
    j3.current.rotation.z = c.q3

    // Rod slides out of the link-3 sleeve; the gripper rides its tip.
    const SLEEVE_IN = 0.7 // rod length hidden inside the sleeve at ext = 0
    // Only EXT_VISUAL of the solved extension is drawn, so the tip stops short
    // of the target ring instead of covering it. IK and collisions still use
    // the full value.
    const visExt = c.ext * EXT_VISUAL
    const rodLen = SLEEVE_IN + TOOL + visExt
    rodRef.current.scale.y = rodLen
    rodRef.current.position.x = L3 - SLEEVE_IN + rodLen / 2
    gripRef.current.position.x = L3 + TOOL + visExt

    // Click twirl: every click adds one full turn about the rod axis; the gripper
    // chases it with fast exponential damping (a snappy flick), then resets to 0.
    const tw = twirl.current
    if (pointer.current.clicks > tw.handled) {
      tw.target += (pointer.current.clicks - tw.handled) * Math.PI * 2
      tw.handled = pointer.current.clicks
    }
    if (tw.target > 0) {
      tw.angle = damp(tw.angle, tw.target, TWIRL_RATE, step)
      if (tw.target - tw.angle < 0.01) tw.angle = tw.target = 0
    }
    gripRef.current.rotation.x = tw.angle
  })

  return (
    <group ref={groupRef} position={BASE}>
      <BasePedestal yawRef={yawRef}>
        <PinJoint radius={0.24} span={1.35} cap={0.34} />
        {/* Link 1 (shoulder) */}
        <group ref={j1}>
          <SmoothLink
            length={L1}
            r0={0.38}
            r1={0.33}
            bulge={0.05}
            sections={[
              { t0: 0, t1: 0.58, thickness: FORK_W },
              { t0: 0.58, t1: 1, thickness: PRONG_W, z: prongZ },
              { t0: 0.58, t1: 1, thickness: PRONG_W, z: -prongZ },
            ]}
          />
          {/* Link 2 (elbow) */}
          <group ref={j2} position={[L1, 0, 0]}>
            <PinJoint radius={0.2} span={0.74} cap={0.28} />
            <mesh castShadow geometry={link2Geometry}>
              <meshStandardMaterial {...linkMat} />
            </mesh>
            {/* Link 3 (wrist) */}
            <group ref={j3} position={[L2, 0, 0]}>
              <PinJoint radius={0.18} span={0.74} cap={0.25} />
              <SmoothLink
                length={L3 * 0.7 - 0.26}
                r0={0.22}
                r1={0.22}
                sections={[
                  { t0: 0, t1: 0.6, thickness: TAB_W },
                  { t0: 0.6, t1: 1, thickness: FORK_W },
                ]}
              />
              {/* Sleeve the rod slides in */}
              <mesh castShadow position={[L3 - 0.45, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.25, 0.25, 0.9, 48]} />
                <meshStandardMaterial {...linkMat} />
              </mesh>
              {/* Telescoping rod (unit cylinder scaled along its own Y axis) */}
              <mesh ref={rodRef} castShadow rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.13, 0.13, 1, 40]} />
                <meshStandardMaterial {...silver} />
              </mesh>
              <group ref={gripRef}>
                <mesh castShadow>
                  <boxGeometry args={[0.18, 0.34, 0.34]} />
                  <meshStandardMaterial {...silver} />
                </mesh>
                {[-1, 1].map((side) => (
                  <mesh key={side} castShadow position={[0.2, side * 0.15, 0]}>
                    <boxGeometry args={[0.3, 0.05, 0.16]} />
                    <meshStandardMaterial {...silver} />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        </group>
      </BasePedestal>

      <ContactShadows position={[0, 0.01, 0]} opacity={0.35} scale={14} blur={2.6} far={4} />

    </group>
  )
}

export default function Arm({ paused = false }) {
  // Normalised cursor position (-1..1); a ref so mouse moves never re-render React.
  const pointer = useRef({ x: 0, y: 0, seen: false, lastMove: 0, clicks: 0 })

  // The canvas sits under the page UI, so listen on the window.
  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
      pointer.current.seen = true
      pointer.current.lastMove = performance.now()
    }
    const onClick = () => {
      pointer.current.clicks += 1
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerdown', onClick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onClick)
    }
  }, [])

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 2]}
      shadows
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      camera={CAMERA}
    >
      <color attach="background" args={['#ffffff']} />
      <hemisphereLight args={['#ffffff', '#cfd6e0', 0.7]} />
      <directionalLight position={[4, 7, 6]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />
      <Environment resolution={256}>
        {/* Soft studio dome: big, even panels above, beside and below, so the
            reflections change gradually with angle instead of flashing. */}
        <Lightformer form="rect" target intensity={2.2} position={[0, 8, 2]} scale={[22, 10, 1]} />
        <Lightformer form="rect" target intensity={1.4} position={[-9, 2, 3]} scale={[8, 12, 1]} />
        <Lightformer form="rect" target intensity={1.4} position={[9, 2, 3]} scale={[8, 12, 1]} />
        <Lightformer form="rect" target intensity={1.2} position={[0, 2, 10]} scale={[16, 8, 1]} />
        <Lightformer form="rect" target intensity={0.9} position={[0, -6, 3]} scale={[20, 6, 1]} />
        <Lightformer form="rect" target intensity={1.0} position={[0, 3, -9]} scale={[18, 8, 1]} />
      </Environment>
      <ArmRig paused={paused} pointer={pointer} />
    </Canvas>
  )
}
