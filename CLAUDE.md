# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Aamir Sheikh's personal engineering portfolio (Mechanical Engineering / Robotics, Boston University). It is **not public yet**: it only runs on localhost. Remote: `github.com/asheikh0105/asheikh0105.github.io`.

Stack: React 19, Vite 8, Tailwind 4, ESLint. The v2 arm uses `three`, `@react-three/fiber`, `@react-three/drei`, `three-bvh-csg` and `three-mesh-bvh@0.8.3` (the version `@react-three/drei` expects; do not upgrade it without checking drei).

Site content (bio, projects, images) is harvested from the old Google Sites portfolio into `old_site_data/content.json` and `old_site_data/images/`. The old contact email in it (`aasheikh@bu.edu`) may be outdated.

## Commands

```
npm run dev      # Vite dev server -> http://localhost:5173/
npm run lint     # eslint .
npm run build    # builds index.html ONLY (index.v2.html is dev-only for now)
```

Two entry points are served by the same dev server:

| URL | Entry | Arm |
|---|---|---|
| `/` | `index.html` -> `src/main.jsx` -> `src/App.jsx` | **v1**: third-party Spline scene (fallback, untouched) |
| `/index.v2.html` | `index.v2.html` -> `src/main.v2.jsx` -> `src/App.v2.jsx` | **v2**: hand-built React Three Fiber arm |

**Rule: v1 files are the fallback. Never edit them. All changes go in the `*.v2.*` copies.** The only shared file edited for v2 is `vite.config.js` (`resolve.dedupe: ['three']`, so three-bvh-csg and the app share one copy of three.js).

## v2 architecture

```
src/App.v2.jsx            copy of App.jsx; Spline replaced by <Arm paused={!onHome} />;
                          white page; zoom lock (see below)
src/arm/Arm.v2.jsx        scene, materials, link/joint/base geometry, per-frame control loop
src/arm/kinematics.v2.js  constants, transform matrices, IK, collision model, solveSafe
src/arm/link2.v2.js       buildForkedLink(): link 2 as one solid (loft minus slot, via CSG)
```

Page UI (App.v2.jsx): dark text on white for the header and home cards; project/about panels keep their dark glass look. Browser zoom is locked (Ctrl/Cmd `+ - 0`, Ctrl+wheel, Safari gesturestart, viewport `user-scalable=no` in `index.v2.html`); menu zoom cannot be blocked.

## Rebuilding the v2 robot arm exactly

Units are scene units. Every link runs along its local **+X**; joints rotate about **Z**; yaw is about **Y**. `kinematics.v2.js` constants are the single source of truth for both rendering and math.

### Constants (`kinematics.v2.js`)

`L1=2.0` shoulder->elbow, `L2=1.8` elbow->wrist, `L3=1.1` wrist->end of sleeve, `TOOL=0.4` rod+gripper always past link 3, `EXT_MAX=0.45` rod travel, `SHOULDER_Y=1.35` shoulder height above base origin.

Forward kinematics (4x4 matrices): `T_tip = Ry(yaw) · Ty(SHOULDER_Y) · Rz(q1) · Tx(L1) · Rz(q2) · Tx(L2) · Rz(q3) · Tx(L3 + TOOL + ext)`.

### Scene graph (`Arm.v2.jsx`)

```
group(BASE)                              BASE.y recomputed every frame (placeBase)
  plinth: cylinder r1.5->1.7, h0.3, y0.15, baseMat
  static race: cylinder r1.12->1.2, h0.2, y0.4, silver; 16 bolts r0.035 at radius 1.055, y0.51
  seal gap: dark cylinder r0.99, h0.03, y0.515
  yaw group (y0.46, rotation.y = yaw)
    rotating race: cylinder r0.98, h0.12, y0.13, silver; 48 teeth (0.06x0.1x0.06) at radius 1.0; 10 bolts at radius 0.9, y0.2
    turret column: cylinder r0.78->0.84, h0.21, y0.295, baseMat
    clevis ears: 2 boxes (0.9 x (SHOULDER_Y-0.86) x 0.22) at z=±0.5, with r0.45 rounded tops at the pin
    shoulder pin group at y = SHOULDER_Y-0.46
      PinJoint(radius 0.24, span 1.35, cap 0.34)
      j1 (rotation.z = q1): link 1
        j2 (position x=L1, rotation.z = q2): PinJoint(0.2, 0.74, cap 0.28), link 2
          j3 (position x=L2, rotation.z = q3): PinJoint(0.18, 0.74, cap 0.25), link 3,
            sleeve, telescoping rod, gripper
  ContactShadows at y0.01 (opacity 0.35, scale 14, blur 2.6, far 4)
```

### Links (all `BEVEL = 0.05`; `thickness` = finished Z width, bevel included)

Shared outline: half-height `h(t) = r0 + (r1-r0)·smoothstep(t) + bulge·sin²(πt)`, round hubs of radius r0/r1 centred ON the joints (x=0 and x=length).

- **Link 1 (heavy, curvy):** `SmoothLink length=L1 r0=0.38 r1=0.33 bulge=+0.05`. Sections: slab t0->0.58 at thickness `FORK_W`; two prongs t0.58->1 at thickness `PRONG_W`, z = ±`prongZ`.
- **Link 2 (slender, one solid):** `buildForkedLink({length:L2, r0:0.28, r1:0.22, bulge:-0.09, tabW:TAB_W, forkW:FORK_W, taperT0:0.28, taperT1:0.74, slotT:0.74, slotHalf:(FORK_W-2·PRONG_W)/2, bevel:BEVEL})`. A rounded-rectangle cross-section loft along the whole link (width eases tab->fork with smoothstep between t 0.28 and 0.74), then a CSG-subtracted slot box. **Do not rebuild it from stacked extrusions**: that produced visible seams/overlapping bodies. The CSG step needs watertight input (tip caps included) and a `uv` attribute.
- **Link 3:** `SmoothLink length=L3·0.7-0.26 r0=0.22 r1=0.22`; sections: tab t0->0.6 at `TAB_W`, body t0.6->1 at `FORK_W`.
- Clevis constants: `FORK_W=0.72`, `PRONG_W=0.17`, `TAB_W=0.34` (slot = 0.38, so each tab has ~0.02 clearance), `prongZ=(FORK_W-PRONG_W)/2`. The shoulder ears' inner faces are at ±0.39, so link 1's 0.72 slab (±0.36) fits between them.
- **Sleeve:** cylinder r0.25, h0.9 at x = L3-0.45, linkMat. **Rod:** unit cylinder r0.13 scaled along its own Y, silver. Rod length = `0.7 + TOOL + visExt`, centre at x = `L3 - 0.7 + rodLen/2`. **Gripper:** palm box 0.18x0.34x0.34 plus two fingers 0.3x0.05x0.16 at (0.2, ±0.15, 0), at x = `L3 + TOOL + visExt`.
- **`visExt = ext · EXT_VISUAL` with `EXT_VISUAL = 0.5`**: only half the solved extension is drawn, so the tip stops short of the cursor. IK and collisions use the full `ext`.

### Joints (actuators)

`PinJoint`: a silver through-pin along Z with an `Actuator` on each side. `Actuator(R)` stacks outward from the link face: silver flange (r=R, h0.06), 8 bolts (r=0.06R at 0.84R), dark housing (r0.7-0.72R, h0.12) with a thin seam groove, silver output hub (r0.44-0.46R, h0.06), dark centre cap (r0.2R). Not hex heads.

### Materials and lighting

- `silver` `#e4e9ef` metalness 0.75 roughness 0.3 (satin aluminum; metalness 1 went black/mirror-bright, avoid)
- `linkMat` `#62748f` 0.5 / 0.42; `baseMat` `#3a465c` 0.45 / 0.5; `actuatorDark` `#252e3f`; `boltMat` `#9aa5b4`
- White canvas background. `hemisphereLight(#fff, #cfd6e0, 0.7)`, directional light `[4,7,6]` intensity 1.4 with shadows, plus a procedural `<Environment>` of six `Lightformer target` panels (soft dome above/sides/front/back/below; no HDR download).
- Canvas: `dpr [1,2]`, antialias, camera `position [0, 0.4, 12.5]`, `fov 34`. Never oversize the canvas to fake resolution.

### Placement and cursor control

- `placeBase(height)`: the base's lowest screen pixel (front edge of plinth, radius 1.7) sits one title-margin above the page bottom (48 px at >=768 px wide, else 24 px, matching `md:top-12` / `top-6`).
- Cursor: window `pointermove` -> NDC -> ray -> intersect the vertical plane `z = BASE.z + 1.0` (`CURSOR_PLANE_Z`) -> target; `y` clamped to >= `MIN_TARGET_Y = 0.4`. **No idle animation**: before the first mouse move, and whenever the cursor stops, the arm holds (rest target `(3.2, 1.6, 1)`). There is no on-screen target marker.
- Joint angles ease with damping (q's 7, ext 6, yaw 6, yaw taking the short way round); each step is shortened (factors 1, .5, .25, .1) if the intermediate pose would collide.

### Inverse kinematics and collisions (`kinematics.v2.js`)

- `inverseKinematics(target, hint)`: `yaw = atan2(-z, x)`; in the arm plane try candidates over fixed grids `PHI_GRID` (-1.6..1.2 step 0.1) x `EXT_GRID` (6 values to `EXT_MAX`), ordered by cost `|phi-phiRef| + 0.3|phi-phi0| + 2|ext-extRef|` (continuity with the previous pose via `hint`); wrist point = target minus `(L3+TOOL+ext)·u`; elbow-up two-link IK; `q3 = phi-q1-q2`; first `isCollisionFree` candidate wins. The grids are fixed so feasibility depends only on the target.
- `solveSafe(desired, lastSafe, prevConfig)`: use `desired` if solvable, else bisect (8 steps) between `lastSafe` and `desired` for the farthest reachable point. The old linear scan had a float bug (skipped `s=0`) that froze the arm; don't reintroduce it.
- Collision model (2D, arm plane; base is axisymmetric so yaw doesn't matter): capsules link1 r0.45, link2 r0.36, link3 (W->0.77) r0.3, sleeve (0.7->L3) r0.26, rod (L3->tip+0.25) r0.2; base rectangles `[-1.7,1.7,0.3]`, `[-1.2,1.2,0.5]`, `[-1.03,1.03,0.65]`, `[-0.9,0.9,0.86]`; floor; links 2-3 vs the shoulder pin (radius 0.4); link1 vs link3/sleeve/rod; link2 vs rod. Margin 0.03. Joint limits: `q2 in [-2.5, 0]`, `q3 in [-1.6, 1.6]` (beyond ~90 deg link 3's wide end would swing into link 2's prongs). Keep the base boxes in sync if base geometry changes.
- Verified in Node: ~1,200 simulated cursor moves gave 0 failed solves, 0 collisions, worst solve ~4 ms.

## Known notes / possible follow-ups

- Link 1 is still slab + prongs from separate extrusions and may show a faint seam; it can be rebuilt with the `link2.v2.js` approach.
- Overhead cursor crossing over the base makes the turret spin ~180 degrees (correct but abrupt).
- The tab/body/prong thickness steps on link 3 and the flat slot walls on link 2 are sharp-edged.
- The ring-gear teeth are decorative (no motor or pinion).
- The cursor can't aim below the arm's floor; the arm then points at floor level.
- To go public: add v2 as a second build input (or promote it to `index.html`), then deploy.
