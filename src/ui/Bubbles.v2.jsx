import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { hasPhotoCarousel, hasPortrait } from './content.v2.js'
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

export function Bubble({ slot, label, thumb, icon, tone = 'photo', onClick, index = 0, large = false, scale = RING_SCALE, thumbZoom, thumbScale, boxPx, dark = false }) {
  const size = sizeFor(scale)
  // boxPx = explicit picture size in px (the tall About Me bubble)
  const width = boxPx ? `${boxPx.w}px` : `calc(${size} * ${RECT_W})`
  const height = boxPx ? `${boxPx.h}px` : `calc(${size} * ${RECT_H})`
  const face =
    tone === 'action'
      ? 'bg-slate-900 text-white'
      : (thumbZoom || thumbScale) && thumb
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
              style={thumbZoom || thumbScale ? { transform: `scale(${thumbZoom ?? thumbScale})` } : undefined}
            />
          ) : icon ? (
            <Icon name={icon} />
          ) : (
            <span className={`${large ? 'text-5xl' : 'text-3xl'} font-semibold tracking-wide`}>{initials(label)}</span>
          )}
        </span>
        <span
          className={`absolute left-1/2 top-full mt-3 line-clamp-2 w-max -translate-x-1/2 pb-1 text-center font-medium leading-snug transition-colors duration-1000 ${dark ? 'text-slate-100' : 'text-slate-800'} ${
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

// "Get In Touch" row on the About page: GitHub, LinkedIn, and an email button whose
// pop-up lists both addresses. The pop-up is portaled (the text panel clips overflow).
const LINKS = {
  github: 'https://github.com/asheikh0105',
  linkedin: 'https://www.linkedin.com/in/aash3ikh/',
}
const EMAILS = [
  { label: 'Personal', address: 'asheikh0105@gmail.com' },
  { label: 'University', address: 'aasheikh@bu.edu' },
]
const ICON_BTN =
  'flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition hover:scale-105 hover:bg-slate-700'

function EmailButton() {
  const [anchor, setAnchor] = useState(null) // button rect while the pop-up is open

  useEffect(() => {
    if (!anchor) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation() // close the pop-up, not the page
        setAnchor(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [anchor])

  return (
    <>
      <button
        type="button"
        aria-label="Email"
        aria-expanded={Boolean(anchor)}
        onClick={(e) => setAnchor(anchor ? null : e.currentTarget.getBoundingClientRect())}
        className={ICON_BTN}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </button>
      {anchor &&
        createPortal(
          <div className="pointer-events-auto fixed inset-0 z-50" onClick={() => setAnchor(null)}>
            <div
              className="absolute w-max -translate-x-1/2 -translate-y-full rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-xl shadow-slate-400/40"
              style={{ left: anchor.left + anchor.width / 2, top: anchor.top - 10 }}
              onClick={(e) => e.stopPropagation()}
            >
              {EMAILS.map((m) => (
                <p key={m.address} className="py-1">
                  <span className="block text-xs text-slate-500">{m.label}</span>
                  <a href={`mailto:${m.address}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
                    {m.address}
                  </a>
                </p>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function GetInTouch() {
  return (
    <div className="mt-4 shrink-0 border-t border-slate-200 pt-4">
      <h3 className="text-base font-semibold text-slate-900">Get In Touch</h3>
      <div className="mt-3 flex items-center gap-3">
        <a href={LINKS.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub" className={ICON_BTN}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d={GITHUB_PATH} />
          </svg>
        </a>
        <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn" className={ICON_BTN}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        </a>
        <EmailButton />
      </div>
    </div>
  )
}

// "**Heading**" at the start of a paragraph renders bold (the old-site text uses it).
function Para({ text }) {
  return (
    <p className="whitespace-pre-line">
      {text.split(/\*\*(.+?)\*\*/).map((part, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-slate-900">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </p>
  )
}

const GITHUB_PATH =
  'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12'

// A card under the text that opens a PDF report or a GitHub repo in a new tab.
function LinkCard({ link }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-4 flex shrink-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:scale-[1.02] hover:shadow-md"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
        {link.kind === 'github' ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d={GITHUB_PATH} />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900">{link.title}</span>
        <span className="block truncate text-xs text-slate-500">{link.sub}</span>
      </span>
    </a>
  )
}

export function TextPanel({ item, side }) {
  const place = side === 'left' ? 'left-[2.5vw] flank-in-left' : 'right-[2.5vw] flank-in-right'
  const body = (
    <>
      <h2 className="text-2xl font-semibold text-slate-900">{item.title}</h2>
      {item.subtitle && <p className="mt-2 text-base text-slate-600">{item.subtitle}</p>}
      {item.date && <p className="mt-1 text-sm text-slate-500">{item.date}</p>}
      <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
        {item.paragraphs.map((para, i) => (
          <Para key={i} text={para} />
        ))}
      </div>
      {item.note && <p className="mt-5 text-xs italic text-slate-500">{item.note}</p>}
    </>
  )
  const links = item.links ?? []
  if (!item.touch && links.length === 0) return <aside className={`${PANEL} ${place}`}>{body}</aside>
  // The Get In Touch row / link cards stay pinned at the bottom while the text scrolls above them.
  return (
    <aside className={`${PANEL} ${place} flex flex-col !overflow-hidden`}>
      <div className="min-h-0 flex-1 overflow-y-auto">{body}</div>
      {item.touch && <GetInTouch />}
      {links.map((l) => (
        <LinkCard key={l.url} link={l} />
      ))}
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
// A single still (About Me portrait): its own panel, not part of the carousel.
function PortraitPanel({ src, className }) {
  const [zoomed, setZoomed] = useState(false)
  return (
    <aside className={`${PANEL} ${className} !overflow-hidden !p-3`}>
      <img src={src} alt="" className="h-full w-full cursor-zoom-in rounded-2xl bg-white object-contain" onClick={() => setZoomed(true)} />
      {zoomed && <Lightbox images={[src]} start={0} onClose={() => setZoomed(false)} />}
    </aside>
  )
}

export function ImagePanel({ item, side }) {
  const place = side === 'left' ? 'left-[2.5vw] flank-in-left' : 'right-[2.5vw] flank-in-right'
  const videos = item.videos ?? []
  const carousel = hasPhotoCarousel(item)
  const portrait = hasPortrait(item)
  if (!carousel && !portrait && videos.length === 0) return null
  return (
    <>
      {portrait && <PortraitPanel src={item.portrait} className={`${place} !bottom-[63%]`} />}
      {carousel && (
        <aside className={`${PANEL} ${place} !overflow-hidden !p-3 ${portrait ? '!top-[39%]' : ''}`}>
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
