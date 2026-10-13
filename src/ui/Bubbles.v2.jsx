import './bubbles.v2.css'

// ---------------------------------------------------------------------------
// Bubble: a thumbnail circle with its label OUTSIDE (below) it.
// ---------------------------------------------------------------------------
// Base size was clamp(84px, 12vmin, 128px). Home bubbles are 2x that; ring
// bubbles (project / design menus) grow by half of that increase, i.e. 1.5x.
export const HOME_SCALE = 2
export const RING_SCALE = 1 + (HOME_SCALE - 1) / 2
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

export function Bubble({ slot, label, thumb, icon, tone = 'photo', onClick, index = 0, large = false }) {
  const diameter = sizeFor(large ? HOME_SCALE : RING_SCALE)
  const face =
    tone === 'action'
      ? 'bg-slate-900 text-white'
      : 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-700'

  return (
    <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
      <button
        type="button"
        onClick={onClick}
        className="bubble-in group pointer-events-auto flex flex-col items-center"
        style={{ animationDelay: `${index * 45}ms` }}
      >
        <span
          style={{ width: diameter, height: diameter }}
          className={`flex items-center justify-center overflow-hidden rounded-full shadow-lg shadow-slate-400/50 ring-2 ring-white transition duration-200 group-hover:scale-105 group-hover:shadow-xl ${face}`}
        >
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : icon ? (
            <Icon name={icon} />
          ) : (
            <span className={`${large ? 'text-5xl' : 'text-3xl'} font-semibold tracking-wide`}>{initials(label)}</span>
          )}
        </span>
        <span
          className={`mt-3 line-clamp-2 pb-1 text-center font-medium leading-snug text-slate-800 ${
            large ? 'max-w-[14rem] text-xl' : 'max-w-[11rem] text-base'
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

export function ImagePanel({ item, side }) {
  const place = side === 'left' ? 'left-[2.5vw] flank-in-left' : 'right-[2.5vw] flank-in-right'
  return (
    <aside className={`${PANEL} ${place} flex flex-col gap-4`}>
      {item.images.length > 0 ? (
        item.images.map((src) => (
          <img key={src} src={src} alt="" className="w-full rounded-2xl border border-slate-200 bg-white object-contain" />
        ))
      ) : (
        <p className="m-auto text-center text-sm text-slate-500">No photos for this one yet.</p>
      )}
    </aside>
  )
}
