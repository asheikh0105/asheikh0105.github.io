import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { hasPhotoCarousel } from './content.v2.js'
import { RECT_H, RECT_W } from './layout.v2.js'
import './bubbles.v2.css'

// ---------------------------------------------------------------------------
// Bubble: a thumbnail box with its label OUTSIDE (below) it. The slot is the centre
// of the PICTURE; the label hangs below it (absolute), so layout maths can use picture boxes.
// ---------------------------------------------------------------------------
// Base size is clamp(84px, 12vmin, 128px), times a scale. Bubbles are rounded
// rectangles: `sizeFor` gives the nominal size, the box is RECT_W x RECT_H of it.
// The home and menu scales are fitted to the window by layout.v2.js and passed
// in as `scale`; RING_SCALE is only the fallback (the Back bubble on detail pages).
export const RING_SCALE = 1.9
const sizeFor = (scale) => {
  const px = `${Math.round(84 * scale)}px`
  const vmin = `${(12 * scale).toFixed(2)}vmin`
  const max = `${Math.round(128 * scale)}px`
  return `clamp(${px}, ${vmin}, ${max})`
}

const initials = (label) =>
  label
    .replace(/[^A-Za-z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

function Icon({ name }) {
  const props = {
    width: '42%',
    height: '42%',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }
  if (name === 'back')
    return (
      <svg {...props}>
        <path d="M19 12H5M11 6l-6 6 6 6" />
      </svg>
    )
  if (name === 'more')
    return (
      <svg {...props}>
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    )
  return (
    <svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}

export function Bubble({ slot, label, thumb, icon, tone = 'photo', onClick, index = 0, large = false, scale = RING_SCALE, thumbZoom, boxPx }) {
  const size = sizeFor(scale)
  // boxPx = explicit picture size in px (the tall About Me bubble)
  const width = boxPx ? `${boxPx.w}px` : `calc(${size} * ${RECT_W})`
  const height = boxPx ? `${boxPx.h}px` : `calc(${size} * ${RECT_H})`
  const face =
    tone === 'action'
      ? 'bg-slate-900 text-white'
      : thumbZoom && thumb
        ? 'bg-white text-slate-700'
        : 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-700'

  return (
    <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
      <button
        type="button"
        onClick={onClick}
        className="bubble-in group pointer-events-auto relative flex flex-col items-center"
        style={{ animationDelay: `${index * 45}ms` }}
      >
        <span
          style={{ width, height }}
          className={`flex items-center justify-center overflow-hidden rounded-3xl shadow-lg shadow-slate-400/50 ring-2 ring-white transition duration-200 group-hover:scale-105 group-hover:shadow-xl ${face}`}
        >
          {thumb ? (
            <img
              src={thumb}
              alt=""
              className={`h-full w-full ${thumbZoom ? 'object-contain' : 'object-cover'}`}
              style={thumbZoom ? { transform: `scale(${thumbZoom})` } : undefined}
            />
          ) : icon ? (
            <Icon name={icon} />
          ) : (
            <span className={`${large ? 'text-5xl' : 'text-3xl'} font-semibold tracking-wide`}>{initials(label)}</span>
          )}
        </span>
        <span
          className={`absolute left-1/2 top-full mt-3 line-clamp-2 w-max -translate-x-1/2 pb-1 text-center font-medium leading-snug text-slate-800 ${
            large ? 'max-w-[16rem] text-xl' : 'max-w-[13rem] text-base'
          }`}
        >
          {label}
        </span>
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Flank: when a terminal bubble is opened, text and images sit either side of
// the arm. Text goes on the side of the bubble that was clicked; images go on
// the opposite side.
// ---------------------------------------------------------------------------
const PANEL =
  'pointer-events-auto fixed top-[11%] bottom-[34%] w-[28vw] min-w-[260px] overflow-y-auto rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-400/30 backdrop-blur-md'

export function TextPanel({ item, side }) {
  const place = side === 'left' ? 'left-[2.5vw] flank-in-left' : 'right-[2.5vw] flank-in-right'
  return (
    <aside className={`${PANEL} ${place}`}>
      <h2 className="text-2xl font-semibold text-slate-900">{item.title}</h2>
      {item.subtitle && <p className="mt-2 text-base text-slate-600">{item.subtitle}</p>}
      {item.date && <p className="mt-1 text-sm text-slate-500">{item.date}</p>}
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
        {item.paragraphs.map((para, i) => (
          <p key={i} className="whitespace-pre-line">
            {para}
          </p>
        ))}
      </div>
      {item.note && <p className="mt-5 text-xs italic text-slate-500">{item.note}</p>}
    </aside>
  )
}

const AUTO_MS = 3000

function Arrow({ dir, onClick, big = false }) {
  return (
    <button
      type="button"
      aria-label={dir === 'prev' ? 'Previous image' : 'Next image'}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/90 text-white shadow-md transition hover:bg-slate-900 hover:scale-105 ${
        big ? 'h-14 w-14' : 'h-10 w-10'
      } ${dir === 'prev' ? (big ? 'left-4' : 'left-2') : big ? 'right-4' : 'right-2'}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
      </svg>
    </button>
  )
}

// Near-fullscreen view of a carousel image. Arrows page through (wrapping), no
// auto-advance. Esc, the X, or a click outside the picture closes it. Rendered in
// a portal because the flank panels' slide-in animation would otherwise trap a
// fixed-position child inside the panel.
function Lightbox({ images, start, onClose }) {
  const n = images.length
  const [i, setI] = useState(start)
  const step = (d) => setI((v) => (v + d + n) % n)

  useEffect(() => {
    const move = (d) => setI((v) => (v + d + n) % n)
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation() // don't also trigger the page's Back
        onClose()
      } else if (n > 1 && e.key === 'ArrowRight') move(1)
      else if (n > 1 && e.key === 'ArrowLeft') move(-1)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [n, onClose])

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-[4vmin]" onClick={onClose}>
      <img
        src={images[i]}
        alt=""
        className="max-h-[92vh] max-w-[92vw] rounded-xl bg-white object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/90 text-white shadow-md transition hover:bg-slate-900"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {n > 1 && (
        <div onClick={(e) => e.stopPropagation()}>
          <Arrow dir="prev" big onClick={() => step(-1)} />
          <Arrow dir="next" big onClick={() => step(1)} />
        </div>
      )}
    </div>,
    document.body,
  )
}

// Wrap-around carousel. The track is [last, ...images, first]: sliding onto a
// clone is followed by an instant (un-animated) snap to the real slide, so the
// loop looks seamless in both directions.
function Carousel({ images }) {
  const n = images.length
  const [pos, setPos] = useState(1)
  const [animate, setAnimate] = useState(true)
  const [zoomed, setZoomed] = useState(false)

  const go = (d) => {
    setAnimate(true)
    setPos((p) => Math.min(n + 1, Math.max(0, p + d)))
  }

  useEffect(() => {
    if (n < 2 || zoomed) return undefined
    const t = setTimeout(() => {
      setAnimate(true)
      setPos((p) => Math.min(n + 1, p + 1))
    }, AUTO_MS) // restarts on every position change, incl. manual clicks
    return () => clearTimeout(t)
  }, [pos, n, zoomed])

  const onEnd = (e) => {
    if (e.target !== e.currentTarget) return
    if (pos === n + 1) {
      setAnimate(false)
      setPos(1)
    } else if (pos === 0) {
      setAnimate(false)
      setPos(n)
    }
  }

  const track = n > 1 ? [images[n - 1], ...images, images[0]] : images
  const shown = n > 1 ? pos : 0

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${shown * 100}%)`,
          transition: animate ? 'transform 500ms ease-in-out' : 'none',
        }}
        onTransitionEnd={onEnd}
      >
        {track.map((src, i) => (
          <div key={i} className="h-full w-full shrink-0">
            <img src={src} alt="" className="h-full w-full cursor-zoom-in object-contain" onClick={() => setZoomed(true)} />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <Arrow dir="prev" onClick={() => go(-1)} />
          <Arrow dir="next" onClick={() => go(1)} />
        </>
      )}
      {zoomed && <Lightbox images={images} start={n > 1 ? (pos - 1 + n) % n : 0} onClose={() => setZoomed(false)} />}
    </div>
  )
}

// Pictures and video are separate panels. With a video AND more than a thumbnail's
// worth of photos, the photo carousel keeps the full panel (so pictures are shown at
// their own scale) and a small video panel sits under it; the video is meant to be
// watched fullscreen. With a video and only a thumbnail, the video is the panel.
export function ImagePanel({ item, side }) {
  const place = side === 'left' ? 'left-[2.5vw] flank-in-left' : 'right-[2.5vw] flank-in-right'
  const videos = item.videos ?? []
  const carousel = hasPhotoCarousel(item)
  if (!carousel && videos.length === 0) return null
  return (
    <>
      {carousel && (
        <aside className={`${PANEL} ${place} !overflow-hidden !p-3`}>
          <Carousel key={item.slug} images={item.images} />
        </aside>
      )}
      {videos.slice(0, 1).map((src) =>
        carousel ? (
          // Small video panel centred under the photo panel (same column as PANEL).
          <div key={src} className={`pointer-events-none fixed top-[calc(66%+14px)] flex w-[28vw] min-w-[260px] justify-center ${place}`}>
            <div className="pointer-events-auto w-[16vw] min-w-[220px] rounded-3xl border border-slate-200 bg-white/80 p-3 shadow-xl shadow-slate-400/30 backdrop-blur-md">
              <video src={src} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-black" />
            </div>
          </div>
        ) : (
          <aside key={src} className={`${PANEL} ${place} !overflow-hidden !p-3`}>
            <video src={src} controls playsInline preload="metadata" className="h-full w-full rounded-2xl bg-black" />
          </aside>
        ),
      )}
    </>
  )
}
