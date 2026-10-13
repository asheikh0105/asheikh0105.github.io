// ---------------------------------------------------------------------------
// Layout. Bubbles sit on an ellipse around the arm, centred on the viewport.
// Angles are in degrees, counter-clockwise from +X (screen right), so 225 is
// bottom-left, 90 is top and -45 is bottom-right.
// ---------------------------------------------------------------------------
const CENTER = { x: 50, y: 50 } // % of viewport
const RADIUS = { x: 40, y: 36 } // % of viewport width / height

export const slotAt = (angleDeg) => {
  const a = (angleDeg * Math.PI) / 180
  return { x: CENTER.x + RADIUS.x * Math.cos(a), y: CENTER.y - RADIUS.y * Math.sin(a) }
}

// Item ring: 8 slots from bottom-left (Back) over the top to bottom-right (More).
export const RING_SLOTS = 8
export const RING_ITEMS_PER_PAGE = RING_SLOTS - 2
const RING_START = 225
const RING_END = -45
export const ringSlot = (index) =>
  slotAt(RING_START + ((RING_END - RING_START) * index) / (RING_SLOTS - 1))

// Home: two columns of two. Projects/Designs on the left (Designs sits below
// and further out), About/Contact mirrored on the right.
const HOME_SLOTS = [
  { x: 23, y: 28 }, // Projects
  { x: 12.4, y: 68 }, // Designs
  { x: 77, y: 28 }, // About
  { x: 87.6, y: 68 }, // Contact
]
export const homeSlot = (index) => HOME_SLOTS[index]

// Back always lives at the ring's first slot (bottom-left), More at the last.
export const BACK_SLOT = ringSlot(0)
export const MORE_SLOT = ringSlot(RING_SLOTS - 1)
