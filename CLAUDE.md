# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Aamir Sheikh's personal engineering portfolio (Mechanical Engineering / Robotics, Boston University). **LIVE at https://asheikh0105.github.io/** (user site, no Vite `base`; deployed 2026-10-20 by `.github/workflows/deploy.yml` on every push to `main`; Settings -> Pages -> Source = GitHub Actions). Remote: `github.com/asheikh0105/asheikh0105.github.io` (public).

Stack: React 19, Vite 8, Tailwind 4, ESLint. The v2 arm uses `three`, `@react-three/fiber`, `@react-three/drei`, `three-bvh-csg` and `three-mesh-bvh@0.8.3` (the version `@react-three/drei` expects; do not upgrade it without checking drei).

Site content (bio, projects, images) is harvested from the old Google Sites portfolio into `old_site_data/content.json` and `old_site_data/images/`. The old contact email in it (`aasheikh@bu.edu`) may be outdated.

## Commands

```
npm run dev      # Vite dev server -> http://localhost:5173/
npm run lint     # eslint .
npm run build    # builds index.html (= v2, the live site); push to main deploys it
```

Entry points (the dev server serves both; only `index.html` is built and shipped):

| URL | Entry | Arm |
|---|---|---|
| `/index.v1.html` | `index.v1.html` -> `src/main.jsx` -> `src/App.jsx` | **v1**: third-party Spline scene (vestigial; kept in the repo on purpose, not built, not shipped) |
| `/` | `index.html` -> `src/main.v2.jsx` -> `src/App.v2.jsx` | **v2**: hand-built React Three Fiber arm (THE site) |

**Rule: v1 files are the fallback. Never edit them. All changes go in the `*.v2.*` copies.** The only shared file edited for v2 is `vite.config.js` (`resolve.dedupe: ['three']`, so three-bvh-csg and the app share one copy of three.js).

## v2 architecture

```
src/App.v2.jsx            bubble navigation state machine + zoom lock; renders <Arm /> (see Page UI)
src/ui/*.v2.*             bubble layout, bubbles, flank panels, content adapter, image preloader
src/arm/Arm.v2.jsx        scene, materials, link/joint/base geometry, per-frame control loop
src/arm/kinematics.v2.js  constants, transform matrices, IK, collision model, solveSafe
src/arm/link2.v2.js       buildForkedLink(): link 2 as one solid (loft minus slot, via CSG)
```

### Page UI: bubble navigation (route 1)

The arm is always mounted and always live (never paused, never hidden). Only the bubbles and the flanking panels change.

```
src/ui/content.v2.js   normalises content.json into terminal items {slug,title,subtitle,date,paragraphs,images,note}; homeBubbles
src/ui/layout.v2.js    slot maths + window-fitted bubble scales: homeLayout(W,H), ringLayout(W,H), BACK_SLOT, NAV_SCALE
src/ui/Bubbles.v2.jsx  Bubble (thumbnail circle, label OUTSIDE below), TextPanel, ImagePanel
src/ui/descriptions.v2.js  written project descriptions + GitHub repo map (see "Project write-ups")
src/ui/bubbles.v2.css  pop-in / slide-in keyframes
src/ui/preload.v2.js   startPreload(): staged image loading + decoding (see below)
```

**State machine** in `App.v2.jsx`: `home` -> `ring` -> `detail`.

- **home:** three bubbles. Left: Projects and Designs (two stacked/offset boxes at the original slots (23%, 30%) and (12.4%, 68%) as picture+caption centres; picture centres are lifted by half a one-line caption so they sit exactly where they used to). Right: one tall **About Me** bubble (picture from `photo_vid_uploads/about/thumbnail.JPG` = `aamirPicture.JPG`), same width as a home bubble, spanning from the top of the Projects picture to the bottom of the Designs picture (its caption lines up with Designs' caption), centred at x = 100 - mean(Projects x, Designs x) = 82.3%. The Contact bubble was removed from home (the `contact` page data is still in `content.v2.js`; re-add to `homeBubbles` + `HOME` layout if wanted).
- **ring** (Projects or Designs): an arc around the arm. Back (slot 0, bottom-left, 225 deg, `NAV_SCALE = 1.14` = 80% of its old size) and More (slot 7, bottom-right) sit on the base ellipse (radii 41%/38%). Items 1-3 run up the left side and 4-6 mirror them down the right (three per side; the U-shaped layout was tried and rejected). The groups lie on the `ARC` ellipse in `layout.v2.js` (centre y 53.4%, radii 40.1/43.1%, angles 179.3 -> 107.8 deg); the middle item of each group is found by bisection so both straight-line gaps are exactly equal in pixels (depends on window shape). Back goes to the previous page (home from page 1); More goes to the next page and is hidden on the last page (Projects: 14 items = 3 pages; Designs: 8 = 2 pages).
- **detail** (a project, a design, About or Contact): text goes on the side of the screen the clicked bubble is on, images on the opposite side, flanking the arm. The ring is hidden; one Back bubble (bottom-left) returns to where you came from. Escape also goes back. The arm stays live throughout (no pause, no dimming overlay).
- About and Contact reuse the detail layout as **placeholders** until their format is specified; Contact has placeholder text and no images.

**Bubble sizes/shape:** rounded rectangles (`rounded-3xl`, box = 1.25 x 0.9 of the nominal size `clamp(84px, 12vmin, 128px)` x scale). Scales are fitted to the window at runtime (`fit` in `layout.v2.js`): start at `HOME_MAX = 2.8` / `RING_MAX = 2.09` (10% over the old 1.9) and shrink until no bubble+caption overlaps another, the header or the edges (assumed caption heights: 76 px home, 60 px menu; the About Me tall bubble is sized from the Projects/Designs boxes, so it shrinks with them). Menu results: 2.09 at 1920x1080 and 1920x1200, ~1.93 at 1536x864, ~1.89 at 1440x900, ~1.75 at 1366x768, ~1.57 at 1280x720 (small windows get smaller bubbles). Bigger than that needs fewer items per page: six picture bubbles + captions fill the arc. A bubble's slot is the centre of its PICTURE; the caption hangs below it (absolute), so layout maths uses picture boxes. Captions use `leading-snug pb-1` because `line-clamp-2` + tight leading clipped descenders (j, g, y) in the first version.

**Image preloading** (`preload.v2.js`): after the window `load` event plus two animation frames it loads AND decodes images in tiers, each tier finishing before the next, 3 at a time: (1) home-bubble thumbnails, (2) project thumbnails in menu order, (3) design thumbnails, (4) all remaining project/design photos and the About photos. Image objects are kept in a module array so the cache is held. Reason: the first version fetched menu images only when a menu opened (only Claw'd's photo, already on the home page, appeared instantly).

The page is white; header and bubble labels are dark. Browser zoom is locked (Ctrl/Cmd `+ - 0`, Ctrl+wheel, Safari gesturestart, viewport `user-scalable=no` in `index.v2.html`); menu zoom cannot be blocked.

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
- Canvas: `dpr [1,2]`, antialias, camera `position [0, 0.4, 12.5 / ARM_SCALE]` with `ARM_SCALE = 0.85` (arm drawn at 85% size by pulling the camera back), `fov 34`. Never oversize the canvas to fake resolution.

### Placement and cursor control

- `placeBase(height)`: the base's lowest screen pixel (front edge of plinth, radius 1.7) sits one title-margin above the page bottom (48 px at >=768 px wide, else 24 px, matching `md:top-12` / `top-6`).
- Cursor: window `pointermove` -> NDC -> ray -> intersect the vertical plane `z = BASE.z + 1.0` (`CURSOR_PLANE_Z`) -> cursor point, pulled back toward the shoulder by `CURSOR_OFFSET = 1.5` (min reach `MIN_REACH = 1.5`) -> target; `y` clamped to >= `MIN_TARGET_Y = 0.4`. **No idle animation**: before the first mouse move, and whenever the cursor stops, the arm holds (rest target `(3.2, 1.6, 1)`). There is no on-screen target marker.
- Click twirl: every `pointerdown` adds one 2*pi turn of the gripper about the rod axis, chased with damping `TWIRL_RATE = 9`, then reset to 0.
- Joint angles ease with damping (q's 7, ext 6, yaw 6, yaw taking the short way round); each step is shortened (factors 1, .5, .25, .1) if the intermediate pose would collide.

### Inverse kinematics and collisions (`kinematics.v2.js`)

- `inverseKinematics(target, hint)`: `yaw = atan2(-z, x)`; in the arm plane try candidates over fixed grids `PHI_GRID` (-1.6..1.2 step 0.1) x `EXT_GRID` (6 values to `EXT_MAX`), ordered by cost `|phi-phiRef| + 0.3|phi-phi0| + 2|ext-extRef|` (continuity with the previous pose via `hint`); wrist point = target minus `(L3+TOOL+ext)·u`; elbow-up two-link IK; `q3 = phi-q1-q2`; first `isCollisionFree` candidate wins. The grids are fixed so feasibility depends only on the target.
- `solveSafe(desired, lastSafe, prevConfig)`: use `desired` if solvable, else bisect (8 steps) between `lastSafe` and `desired` for the farthest reachable point. The old linear scan had a float bug (skipped `s=0`) that froze the arm; don't reintroduce it.
- Collision model (2D, arm plane; base is axisymmetric so yaw doesn't matter): capsules link1 r0.45, link2 r0.36, link3 (W->0.77) r0.3, sleeve (0.7->L3) r0.26, rod (L3->tip+0.25) r0.2; base rectangles `[-1.7,1.7,0.3]`, `[-1.2,1.2,0.5]`, `[-1.03,1.03,0.65]`, `[-0.9,0.9,0.86]`; floor; links 2-3 vs the shoulder pin (radius 0.4); link1 vs link3/sleeve/rod; link2 vs rod. Margin 0.03. Joint limits: `q2 in [-2.5, 0]`, `q3 in [-1.6, 1.6]` (beyond ~90 deg link 3's wide end would swing into link 2's prongs). Keep the base boxes in sync if base geometry changes.
- Verified in Node: ~1,200 simulated cursor moves gave 0 failed solves, 0 collisions, worst solve ~4 ms.

## Status and handoff

**State (2026-10-20):** LIVE on GitHub Pages and confirmed working from a second device by the user. `index.v2.html` was promoted to `index.html` (title "Aamir Sheikh"); old `index.html` is now `index.v1.html`. All 8 mp4s are committed (A1: ship as-is). The user approved the arm, bubble navigation and most of the items below, judged by eye (Claude cannot open a browser; layout maths were checked numerically in Node). Baseline tags: `arm-v2-baseline`, `ui-bubbles-baseline`.

### Done since the bubble-UI baseline (newest topics first)
- **Project write-ups (2026-10-19/20 sessions):** written descriptions live in `src/ui/descriptions.v2.js` (see "Project write-ups" section). Done: LQR Inverted Pendulum, CLAW'D, Analysis of 2nd Order System, Coil Winder, Self-Steering Tricycle, Linear Motor Control System, Bar Balancing Car, Multi-Robot Navigator, Obstacle Course Navigator, Blue-Line Following Robot, E-Bike Conversion (thumbnail uploaded). Gait Tracker and Room Temperature Monitor keep their short old-site text (user: keep as is). The big projects use bold `**Heading**` sections plus an "Engineering skills" line; the later ones (LIMO projects, E-Bike) are deliberately 1-2 short paragraphs. Remaining: Eye Tracker and Banana Finder (not yet discussed).
- **In-text links:** `[[slug|Label]]` in a description paragraph renders an underlined button (`Para` in `Bubbles.v2.jsx`) that opens that project/design (`openLinked` in `App.v2.jsx`); Back/Esc return to the page you came from. Used for tricycle -> Linear Actuator Steering Mechanism / Electronics Mounting Rack, Linear Motor -> Syringe Case, Bar Balancing Car -> Wheel and Tire Assembly. Designs have almost no text yet, so no links back.
- **videoFirst layout:** `VIDEO_FIRST` in `content.v2.js` (Obstacle Course Navigator): the video is the big panel and the photos a small carousel under it (opposite of the default). Add a slug to the set to use it elsewhere.
- **About Me page**: the portrait is its own panel (`item.portrait`, lightbox on click) above a certificates-only carousel; text panel has a pinned **Get In Touch** row (GitHub, LinkedIn, email icon whose pop-up lists asheikh0105@gmail.com (personal) and aasheikh@bu.edu (university)). Contact page data is still unused.
- **Link cards** under a project's text (`item.links`, `LinkCard` in `Bubbles.v2.jsx`): PDF reports (any `*.pdf` in `photo_vid_uploads/<slug>/` is copied to `public/media/<slug>/r<N>.pdf` by the media script; label = `reportTitle` in `descriptions.v2.js`) and a "View on GitHub" card from `githubRepos` (8 projects). LQR has the EC 402 report.
- **Projects menu**: E-Bike Conversion listed (always, via `ALWAYS_LISTED`; now has a write-up and thumbnail), 6th on page 2; Eye Tracker is first on page 3 (15 projects = 3 pages); full order in `PROJECT_ORDER`. Multi-Robot Navigator and Blue-Line Following Robot now have media. Claw'd renamed "CLAW'D - the wireless claw machine game" (`TITLES`; check the caption has no "..." in the menu, else drop "game"); carousel hides positions 12, 14, 15, 16, 17, 19, 20, 22 (`CAROUSEL_HIDE`, 1-based, position 1 = thumbnail slide).
- **Menu bubbles ~3% bigger**: `RING_MAX = 2.15`; `layout.v2.js` has two arcs (`ARCS`) and `ringLayout` picks whichever gives larger bubbles for the window (new taller arc: 2.15 at 1920x1080 / 1920x1200 / 1440x900; original arc kept so small windows do not shrink: 1.91 at 1536x864, 1.75 at 1366x768, 1.57 at 1280x720).
- **Dance mode** (approved by the user: "perfect"): home-page button -> looping arm routine, dark "lights out" page, disco ball dropping from the top with 30 colour-cycling rays, five coloured orbiting lights and a colour wash; hovering the button drops the cursor offset (arm reaches the cursor). **Clicking any bubble (Projects, Designs, About Me) ends dance mode immediately and normal behaviour returns** (page back to white, ball lifts, arm follows the cursor again); the button only exists on the home page. See the Dance mode section.
- **Photos/video as separate panels** on detail pages (see that section): small video panel under a full-size photo carousel.
- **About Me**: tall bubble on the home right (picture `aamirPicture` -> `photo_vid_uploads/about/`), Projects/Designs untouched; Contact bubble removed from home; picture-centred bubble anchoring (caption absolute below).
- **Menu ring**: back to an arc, three bubbles per side, exactly equal gaps in pixels, sizes fitted to the window (`layout.v2.js`), Back/More at 80% of old size; home bubbles +25%. (A U-shaped layout was tried and rejected by the user.)
- **Lightbox** for carousel photos (arrows persistent, no autoplay).
- **Cursor**: tip stops `CURSOR_OFFSET = 1.5` units short of the cursor along the shoulder->cursor line (no collision logic); click = snappy 360 gripper twirl (`TWIRL_RATE`).
- **Arm** drawn at 85% (`ARM_SCALE` pulls the camera back).
- **Designs**: +2 new designs (Linear Actuator Steering Mechanism first, Electronics Mounting Rack second), 8 total = 2 pages; thumbnail zoom tweaks (`DESIGN_TWEAKS`); folders in `photo_vid_uploads/`.
- **Projects**: Self-Steering Tricycle added to page 1 (Bar Balancing Car moved to page 2); home Projects bubble uses the tricycle thumbnail; Linear Motor carousel starts with its `thumbnail`.
- **Media pipeline** (`scripts/build-media.mjs`): originals in `photo_vid_uploads/<slug>/` -> web-sized files in `public/media/` + `src/ui/media.v2.json`.
- **Carousel** (see that section): replaces vertical scrolling; auto-advance 3 s, opaque arrows, seamless wrap.
- **Menu navigation fixes**: Back goes to the previous page (home from page 1), More only on non-last pages.
- **Placeholder cleanup**: internal harvest notes and filename-derived dates are no longer shown; empty projects hidden; no "No photos" text.

### OPEN LOOPS (next session)
0. ~~Launch~~ **DONE 2026-10-20** (see State). Lint, build and `vite preview` (page, mp4, favicon all 200) were run before the push. User is backing up the whole repo (incl. gitignored `photo_vid_uploads/`) to a NAS.
1. ~~Videos on GitHub Pages~~ **DONE**: mp4s committed as-is and served. Optional later: re-encode smaller (540p) if load time matters. The originals in `photo_vid_uploads/` are gitignored; the NAS copy is the only backup.
2. **Contact**: filler text only, and the bubble is not on the home page. Need real details (the old email `aasheikh@bu.edu` may be outdated) and a place for the bubble.
3. **About Me** bio text is still the old-site bio (layout and Get In Touch are done); the old profile photo `old_site_data/images/about/1.jpg` was NOT deleted (the v1 Spline page still uses it) but v2 no longer uses it. Delete if the user confirms v1 may lose it.
4. **Missing content**: **NEXT SESSION: finish the walkthrough with Eye Tracker, then Banana Finder** (the user wants to be prompted per project, super brief like Gait Tracker; for the AgileX LIMO projects the course is not mentioned). Tricycle through E-Bike are written (see above). Also: the two new designs and the other designs have only a line or nothing; no STL/download links exist. Source text for existing projects: `old_site_data/content.json` (print with `PYTHONIOENCODING=utf-8`). Condense it into the uniform format; do not invent facts.
4b. **GitHub repos are thin**: `LQR-Inverted-Pendulum` is one `.ino` file with no README; `Data-Processing-for-2nd-Order-Oscillator` has a short README. Suggest the user add READMEs before going public. Claw'd and Coil Winder have no repo.
4c. **Claw'd carousel numbering was ambiguous** (user said "12 14 16 17" after an earlier list; interpreted as additive, original 22-photo numbering, 1-based). Ask the user to confirm the carousel looks right.
5. **Not visually verified by Claude** (dance mode is user-approved): the arc/home layouts (overlap-checked in Node only; 16:10 and small laptop windows get smaller bubbles: ~1.75 at 1366x768, ~1.57 at 1280x720), the small video panel and the moved Back bubble, the lightbox, the cursor offset/twirl feel, header collisions on narrow windows.
6. **"De-AI" the UI** (copy, type, spacing, bubble styling) planned by the user.
7. ~~Going public~~ **DONE** (v2 is `index.html`; v1 is `index.v1.html`, unbuilt). Remaining: the build warns about a 1.3 MB JS chunk (code-split three/drei if load time matters); the repo and `old_site_data/` are public, so the old email is visible there.
8. Minor: Six "T" Puzzle and 9V Battery Holder have no `thumbnail.*` file (first photo used); very wide or short windows are untested.

### Struggles and gotchas (so they are not rediscovered)

- **Never visually verified by Claude.** The agent could not open a browser during this work; the user judged the look and fed back. The kinematics/collision/geometry builders and the bubble layouts were checked numerically in Node. Not yet checked at all: preloader timing, and header collisions at narrow widths.
- **Bubble anchor bug (fixed):** bubbles used to be centred on picture+caption, so top bubbles could clip off the top of the window while the Node overlap maths assumed picture centres. Now the slot is the picture centre and the caption is absolutely positioned below.
- **fixed-position child inside the flank panels** is trapped by their transform animation: portal overlays to `document.body` (lightbox).
- **ffmpeg cannot decode iPhone HEIC**: `scripts/heic_to_jpg.py` (pillow-heif) is used; the `PYTHON` env var selects the interpreter (the shell `python` may differ from the Python 3.12 that has pillow-heif).
- **IK search bug (fixed):** a linear scan with a floating-point step skipped `s = 0`, returned `null`, and froze the arm; the first idle animation also snapped the arm to the corner. Idle animation was removed. Keep `solveSafe` as bisection and keep the IK grids fixed.
- **Branch flips in IK** caused joint snapping until candidates were ordered by continuity with the previous pose (`hint`).
- **Link 2 seams:** stacking separate extrusions left visible internal lines; the fix was one lofted solid minus a slot box via CSG. A first `npm install three-bvh-csg` failed on a peer conflict: install `three-bvh-csg@0.0.17` with `three-mesh-bvh@0.8.3` (what drei expects), and keep `resolve.dedupe: ['three']` in `vite.config.js` to avoid "Multiple instances of Three.js".
- **Bevel arithmetic:** an extrusion with bevels is `depth + 2*bevelThickness` thick and its outline grows by `bevelSize`. Collision radii and clearances (turret top, ears at +-0.39) were tuned against this.
- **Lightformer needs `target`**, otherwise the panels all face +Z and the arm lights wrong. `metalness: 1` made the arm black or mirror-bright depending on angle; satin 0.75 fixed it.
- **Zoom lock caveat:** Ctrl/Cmd +/-/0, Ctrl+wheel and Safari pinch are blocked, but zoom from the browser menu cannot be.
- **Windows tooling:** Python defaults to cp1252 when reading files here, so pass `encoding='utf-8'` to `open()`. Git warns about LF -> CRLF on every file (harmless; `.gitattributes` controls it). The edit tool refuses to write a file it has not freshly read.
- **Silent no-op edits (2026-10-19):** a Python `str.replace` whose old string did not match changed nothing and printed nothing, so the Claw'd carousel stayed at 22 photos while the user believed it was fixed ("my website was not updated"). After any scripted replace, grep the file to confirm, or `assert old in s`. The Claw'd 2%-crop edit had the same problem.
- **Bash tool quoting:** a long `python - <<'EOF'` heredoc containing mixed quotes/apostrophes failed with "unexpected EOF" and applied nothing. For big edits use the Edit/Write tools, or Write a script file into the scratchpad and run it.
- **PDF reading:** the shell `python` has no pypdf; it was installed into `C:\Users\aamir\AppData\Local\Programs\Python\Python312` (run that interpreter). The Read tool cannot render PDFs here (no poppler). Extract text with pypdf to the scratchpad.
- **Menu bubble limit:** at 1920x1080 the fitted scale was capped at ~2.08 by neighbour overlap (bubble + 60 px caption) on the arc, so "3% bigger" needed a taller arc, not just a bigger `RING_MAX`.
- **Leftover:** `thumbScale` (prop on `Bubble`, `item.thumbScale` in `App.v2.jsx`) was added for a 2% Claw'd crop tweak that was then undone; nothing sets it now. Safe to remove.
- **The user's dev server** was on :5173 (stopped at shutdown). A stale tab may show old content: hard refresh.
- **Process:** v1 files are kept as the fallback by convention; v2 files carry the changes.

### Known design notes / possible follow-ups

- Link 1 is still slab + prongs from separate extrusions and may show a faint seam (known from the mesh; the user cannot see it in the browser, so low priority); it can be rebuilt with the `link2.v2.js` approach.
- Overhead cursor crossing over the base makes the turret spin ~180 degrees (correct but abrupt; the user has not encountered it).
- The thickness steps on link 3 and the flat slot walls on link 2 are sharp-edged.
- The ring-gear teeth are decorative (no motor or pinion).
- The cursor can't aim below the arm's floor; the arm then points at floor level.
- The bubble ring slots are fixed (empty slots stay empty on a short last page; items fill from the left).
- Side panels are about 28vw wide and 55vh tall and can overlap the arm when it reaches sideways (they are translucent).
- To go public: add v2 as a second build input (or promote it to `index.html`), then deploy. `npm run build` currently builds only `index.html`.

## Photos and videos (media pipeline)

Drop originals in `photo_vid_uploads/<project-slug>/` (gitignored: GBs). `thumbnail.*` = bubble image + first carousel slide; other photos go in the carousel (`old-N` first, then the rest); videos are shown above the carousel (video-only if the thumbnail is the only photo). Run `node scripts/build-media.mjs` (set `PYTHON=` to a Python with `pillow-heif` for iPhone HEIC): it writes web-sized files to `public/media/<slug>/` (photos 1600 px, thumbs 800 px, videos 720p H.264) and `src/ui/media.v2.json`, which `content.v2.js` reads for projects. Designs and About still use `old_site_data/images`.

### Videos on GitHub Pages (resolved)
All 8 videos (~114 MB of 143 MB in `public/media/`) are committed and deployed; largest 41 MB (limit 100 MB per file). `.gitignore` no longer excludes mp4s.

## Project write-ups (`src/ui/descriptions.v2.js`)
`descriptions[slug] = { subtitle, paragraphs[], reportTitle? }` overrides the old-site summary/description for that project (applied in `withMedia`, `content.v2.js`). `subtitle: ''` shows no line under the title. A paragraph may start with `**Heading**\n` (rendered bold by `Para` in `Bubbles.v2.jsx`). `githubRepos[slug]` = repo name under github.com/asheikh0105 (LQR-Inverted-Pendulum, Bar-Balancing-Car, Eye-Tracker, Banana-Detector, Obstacle-Course-Navigator, Data-Processing-for-2nd-Order-Oscillator, Multi-Robot-Navigator, Blue-Line-Following-Robot). User preferences so far: first person where it is his work; later projects should be SUPER brief (1-2 short paragraphs); do not name the course; leave out teammates by name (credit his role only); no measured-outcome claims unless he states them; skip AI-tool disclosures; uniform format across projects.

## Live-site content rules (placeholder cleanup)
- No placeholder or scrape text may be visible. `content.v2.js` no longer passes `media_note` (internal harvest notes like "no retrievable photos") or `date` (filename-derived strings) to the UI.
- **Contact** has FILLER text ("Contact details coming soon...") by request; replace it with real details before going live.
- A project with no summary, text, photos or video is filtered out, except slugs in `ALWAYS_LISTED` (**E-Bike Conversion**, shown with an empty page until written). With no media at all, the image panel is not rendered (no "No photos" message).
- Still to change before going live: `index.v2.html` title says "Aamir Sheikh (v2)"; v1 `src/App.jsx` has a placeholder line (v1 is never edited, so just don't ship it).

## Designs
8 designs (2 menu pages). `content.v2.js`: `newDesigns` (Linear Actuator Steering Mechanism, Electronics Mounting Rack; no content yet) are first in `DESIGN_ORDER`, steering mechanism first, so its photo becomes the Designs home bubble once uploaded (until then the first design with a photo is used). `DESIGN_TWEAKS` holds per-design thumbnail tweaks: Wheel and Tire and Electronics Mounting Rack have `thumbZoom: 0.95`, Helmet Holder and Linear Actuator Steering Mechanism `thumbZoom: 0.975` (bubble only, incl. the home Designs bubble: whole picture at 95% on white instead of cropped; the design page image is never scaled). Every design has a folder in `photo_vid_uploads/<slug>/` (old photos copied in as `old-N`); designs go through the same `build-media.mjs` pipeline as projects.
- `build-media.mjs` wipes and regenerates a folder's photo outputs each run (videos are kept), so deleted/renamed originals never leave stale files. `THUMB_NOT_IN_CAROUSEL` in the script lists folders whose `thumbnail.*` is the bubble image only (currently `electronics-mounting-rack`). A folder with no `thumbnail.*` uses its first photo (`six-t-puzzle`, `nine-volt-battery-holder` currently).

## Lightbox
Clicking a carousel photo opens a near-fullscreen view (`Lightbox` in `Bubbles.v2.jsx`, portaled to `document.body` because the flank panels' transform animation would trap a fixed child). Persistent opaque arrows (wrap-around, plus Left/Right keys), no auto-advance (the panel carousel is paused while it is open), close via X, backdrop click or Esc (capture-phase listener so Esc does not also trigger the page's Back). `RING_SCALE = 1.9` in `Bubbles.v2.jsx` is now only the fallback size (detail-page Back bubble).

## Detail pages: photos and video are separate panels
With a video AND more than a thumbnail's worth of photos (`hasSmallVideo`): the photo carousel keeps the full-size panel (so pictures get their own scale) and a small video panel (16vw, native controls/fullscreen) sits centred under it (top = 66% + 14 px). With a video and only a thumbnail, the video fills the panel. If the small video would be in the left column, the detail Back bubble moves to the bottom-right corner (`MORE_SLOT`) so it does not sit on the video.

## Carousel
`Carousel` (in `Bubbles.v2.jsx`): strip `[last, ...images, first]` translated by `pos x 100%`; 500 ms slide; at a clone the strip snaps (no transition) to the real slide on `transitionend`. Auto-advance every 3 s via a timeout keyed on `pos` (so a click restarts it); paused while the lightbox is open. Arrows are opaque dark circles. Clicking a photo opens the lightbox.

## Dance mode
A "Dance mode" button on the home page: a rounded rectangle (width 9.25rem, `left-[66%]`, between the About Me bubble and the arm base). Its vertical centre is the middle of the span from the bottom of the About Me caption text to the arm base's bottom edge (48 px / 24 px above the page bottom); its height is half that span (min 44 px), about 59 px at 1080p; icon above the label. Toggles `dancing` in `App.v2.jsx`, which stops when you leave home through a bubble. While dancing: (1) `danceTarget(t)` in `Arm.v2.jsx` drives the tip through a looping 4-bar routine (BEAT 0.55 s: pump, swing right->left through the camera side, 360-degree spin, wave; targets are base-relative at radius `DANCE_R = 3.0`, heights ~2-4.4), blended in/out with the cursor target (`dance.blend`); the gripper twirls at each bar start (except the swing bar) and again mid wave bar; (2) `DiscoBall` (faceted mirror icosahedron on a line) drops from above the view (`BALL_HIDDEN_Y` -> `BALL_REST_Y`); 30 additive, colour-cycling light rays fan out from it (`makeRays`: open cones, narrow end at the ball, alphaMap fade with distance, turning with the ball, pulsing) and five saturated coloured point lights (`DISCO_COLOURS`, intensity ~26) orbit it and colour the arm; (3) `.disco-wash` in `bubbles.v2.css` is a slow pastel colour wash, `screen`-blended at 0.34 opacity with four saturated blobs (pink, cyan, amber, violet) (z-[1], under the UI). Dance mode also turns the lights out: the page background (`#1a1e2a`, a dark navy, not black), the canvas background, header text and home bubble captions fade to dark-mode colours over ~1 s (`dancing` -> `dark`), and `Stage` in `Arm.v2.jsx` dims the studio lights (hemisphere 0.7 -> 0.14, sun 1.4 -> 0.3, `scene.environmentIntensity` 1 -> 0.18); the disco ball has a little emissive so it still reads. Hovering the button sets `fullReach`, which drops `CURSOR_OFFSET` so the arm reaches all the way to the cursor (this button only). All routine targets were checked reachable (1,056 steps at 60 fps, 0 failed solves). The user has approved the choreography, lighting and dark mode by eye. Leaving home via a bubble calls `leaveHome()` (stops `dancing` and the hover flag).
