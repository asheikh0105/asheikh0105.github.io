// ---------------------------------------------------------------------------
// Layout. Slots are % of the viewport (bubble centres). Bubble sizes are fitted
// to the window: each layout starts at a maximum scale and shrinks it until no
// bubble (picture + caption) overlaps another, the page header, or the edges.
// ---------------------------------------------------------------------------

// Bubble box = RECT_W x RECT_H of the nominal size (see sizeFor in Bubbles).
export const RECT_W = 1.25
export const RECT_H = 0.9
const nominalPx = (scale, W, H) => Math.min(128 * scale, Math.max(84 * scale, 0.12 * Math.min(W, H) * scale))

const EDGE = 8 // min distance from the window edge (px)
const GAP = 4 // min gap between bubbles (px)
const header = (W) => {
  const m = W >= 768 ? 48 : 24 // matches the title's md:left-12 / md:top-12
  return { x1: 0, y1: 0, x2: m + 290, y2: m + 68 }
}

// Pixel box of a bubble including its caption below.
const boxOf = (slot, scale, W, H, labelH) => {
  const S = nominalPx(scale, W, H)
  const cx = (slot.x / 100) * W
  const cy = (slot.y / 100) * H
  return { x1: cx - (S * RECT_W) / 2, x2: cx + (S * RECT_W) / 2, y1: cy - (S * RECT_H) / 2, y2: cy + (S * RECT_H) / 2 + labelH }
}
const hit = (a, b, gap) => a.x1 < b.x2 + gap && b.x1 < a.x2 + gap && a.y1 < b.y2 + gap && b.y1 < a.y2 + gap
const outside = (b, W, H) => b.x1 < EDGE || b.x2 > W - EDGE || b.y1 < EDGE || b.y2 > H - EDGE

// Largest scale <= max (down to min) for which `fits(scale)` holds.
const fit = (max, min, fits) => {
  for (let s = max; s > min; s -= 0.02) if (fits(s)) return s
  return min
}

// ---- Base ellipse: Back / More ---------------------------------------------
const slotAt = (angleDeg) => {
  const a = (angleDeg * Math.PI) / 180
  return { x: 50 + 41 * Math.cos(a), y: 50 - 38 * Math.sin(a) }
}
export const BACK_SLOT = slotAt(225) // bottom-left
export const MORE_SLOT = slotAt(-45) // bottom-right

// Back / More in the menus: 80% of their previous size (was 0.75 x 1.9).
export const NAV_SCALE = 1.14

// ---- Home ---------------------------------------------------------------------
// Left: Projects and Designs (fixed slots). Right: one tall "About Me" bubble that
// spans from the top of the Projects picture to the bottom of the Designs caption
// (so its picture ends where Designs' picture ends and the two captions line up).
// A slot is the centre of a bubble's PICTURE; its caption hangs below.
// Projects/Designs keep the on-screen position they had when slots were the centre
// of picture + caption: picture centre = old slot - half a one-line caption (44 px).
const PROJECTS_SLOT = { x: 23, y: 30 }
const DESIGNS_SLOT = { x: 12.4, y: 68 }
const ONE_LINE_CAPTION = 44
const ABOUT_X = 100 - (PROJECTS_SLOT.x + DESIGNS_SLOT.x) / 2 // mirror of the left column's middle
export const HOME_MAX = 2.8
const HOME_LABEL_H = 76 // reserved caption height (2 lines)

export function homeLayout(W, H) {
  const lift = (slot) => ({ x: slot.x, y: slot.y - ((ONE_LINE_CAPTION / 2) / H) * 100 })
  const projects = lift(PROJECTS_SLOT)
  const designs = lift(DESIGNS_SLOT)
  const geometry = (s) => {
    const S = nominalPx(s, W, H)
    const top = (projects.y / 100) * H - (S * RECT_H) / 2
    const bottom = (designs.y / 100) * H + (S * RECT_H) / 2
    const about = { w: S * RECT_W, h: bottom - top }
    const slots = [projects, designs, { x: ABOUT_X, y: ((top + bottom) / 2 / H) * 100 }]
    const boxes = [
      boxOf(projects, s, W, H, HOME_LABEL_H),
      boxOf(designs, s, W, H, HOME_LABEL_H),
      { x1: (ABOUT_X / 100) * W - about.w / 2, x2: (ABOUT_X / 100) * W + about.w / 2, y1: top, y2: bottom + HOME_LABEL_H },
    ]
    return { slots, boxes, about }
  }
  const scale = fit(HOME_MAX, 1.6, (s) => {
    const { boxes } = geometry(s)
    const head = header(W)
    return boxes.every((b, i) => !outside(b, W, H) && !hit(b, head, 0) && boxes.every((c, j) => j <= i || !hit(b, c, GAP)))
  })
  const { slots, about } = geometry(scale)
  return { scale, slots, aboutBox: about } // aboutBox: picture size in px of the tall About Me bubble
}

// ---- Menu ring ---------------------------------------------------------------
// An arc around the arm: Back (slot 0) bottom-left, then three items up the left
// side, three down the right side (mirrored), then More (slot 7) bottom-right.
// Within each group of three the straight-line gaps are EXACTLY equal in pixels
// (the middle item is found by bisection, so it depends on the window's shape).
// The six picture bubbles are as large as will fit, up to RING_MAX.
export const RING_SLOTS = 8
export const RING_ITEMS_PER_PAGE = RING_SLOTS - 2
const ARC = { rx: 40.1, ry: 43.1, cy: 53.4, from: 179.3, to: 107.8 } // ellipse radii / centre (% of window), group start / end angle (deg)
export const RING_MAX = 2.09 // 10% over the old 1.9
const RING_LABEL_H = 60

const arcPoint = (angleDeg, W, H) => {
  const a = (angleDeg * Math.PI) / 180
  return { x: 50 + ARC.rx * Math.cos(a), y: ARC.cy - ARC.ry * Math.sin(a), px: (W * ARC.rx * Math.cos(a)) / 100, py: (H * ARC.ry * Math.sin(a)) / 100 }
}

function leftGroup(W, H) {
  const dist = (a, b) => {
    const p = arcPoint(a, W, H)
    const q = arcPoint(b, W, H)
    return Math.hypot(p.px - q.px, p.py - q.py)
  }
  let lo = ARC.to
  let hi = ARC.from
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (dist(ARC.from, mid) < dist(mid, ARC.to)) hi = mid
    else lo = mid
  }
  return [ARC.from, (lo + hi) / 2, ARC.to].map((angle) => arcPoint(angle, W, H))
}

export function ringLayout(W, H) {
  const left = leftGroup(W, H)
  const items = [...left, ...[...left].reverse().map((p) => ({ x: 100 - p.x, y: p.y }))] // items 1..6
  const slots = [BACK_SLOT, ...items, MORE_SLOT]
  const nav = [BACK_SLOT, MORE_SLOT].map((slot) => boxOf(slot, NAV_SCALE, W, H, RING_LABEL_H))
  const head = header(W)

  const scale = fit(RING_MAX, 1.5, (s) => {
    const boxes = items.map((slot) => boxOf(slot, s, W, H, RING_LABEL_H))
    const all = [...boxes, ...nav]
    for (let i = 0; i < all.length; i++) {
      if (outside(all[i], W, H)) return false
      for (let j = i + 1; j < all.length; j++) if (hit(all[i], all[j], GAP)) return false
    }
    return !boxes.slice(0, 3).some((b) => hit(b, head, 0))
  })
  return { scale, slots } // slots[0] = Back, 1-6 = items, 7 = More
}
