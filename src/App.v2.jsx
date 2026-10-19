import { useEffect, useState } from 'react'
import Arm from './arm/Arm.v2.jsx'
import { hasSmallVideo, homeBubbles, sections, terminals } from './ui/content.v2.js'
import { BACK_SLOT, MORE_SLOT, NAV_SCALE, RING_ITEMS_PER_PAGE, homeLayout, ringLayout } from './ui/layout.v2.js'
import { Bubble, ImagePanel, TextPanel } from './ui/Bubbles.v2.jsx'
import { startPreload } from './ui/preload.v2.js'

// Navigation is a small state machine. The arm is always mounted and always
// live; only the bubble arrangement (and the flanking panels) change.
//   { name: 'home' }
//   { name: 'ring',   section, page }            a ring of project/design bubbles
//   { name: 'detail', item, side, returnTo }     text + images flanking the arm
const HOME = { name: 'home' }

// Back in a ring: previous page, or home from the first page.
const ringBack = (v) => (v.page > 0 ? { ...v, page: v.page - 1 } : HOME)

function App() {
  // Lock browser zoom (ctrl/cmd +, -, 0 and ctrl+wheel, plus Safari pinch) so
  // the fixed-position bubbles keep their layout. Zoom from the browser menu
  // can't be intercepted by a web page.
  useEffect(() => {
    const blockKeys = (event) => {
      if ((event.ctrlKey || event.metaKey) && ['+', '=', '-', '_', '0'].includes(event.key)) {
        event.preventDefault()
      }
    }
    const blockWheel = (event) => {
      if (event.ctrlKey) event.preventDefault()
    }
    const blockGesture = (event) => event.preventDefault()
    window.addEventListener('keydown', blockKeys)
    window.addEventListener('wheel', blockWheel, { passive: false })
    window.addEventListener('gesturestart', blockGesture)
    return () => {
      window.removeEventListener('keydown', blockKeys)
      window.removeEventListener('wheel', blockWheel)
      window.removeEventListener('gesturestart', blockGesture)
    }
  }, [])

  // After the home page is up, warm the image cache: projects, then designs, then the rest.
  useEffect(() => {
    startPreload()
  }, [])

  const [view, setView] = useState(HOME)

  // Dance mode (button on the home page): the arm dances, a disco ball drops and a
  // soft colour wash plays. fullReach drops the cursor offset while hovering the button.
  const [dancing, setDancing] = useState(false)
  const [overDance, setOverDance] = useState(false)
  // Leaving the home page (via a bubble) stops the dance.
  const leaveHome = () => {
    setDancing(false)
    setOverDance(false)
  }

  // Bubble sizes and positions are fitted to the window (see layout.v2.js).
  const [win, setWin] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setWin({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Escape = the Back bubble.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setView((v) => (v.name === 'detail' ? v.returnTo : v.name === 'ring' ? ringBack(v) : v))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Which side of the screen a bubble sits on decides where the text goes.
  const sideOf = (slot) => (slot.x < 50 ? 'left' : 'right')
  const openDetail = (item, slot, returnTo) => {
    leaveHome()
    setView({ name: 'detail', item, side: sideOf(slot), returnTo })
  }

  let bubbles
  let panels = null

  if (view.name === 'home') {
    const home = homeLayout(win.w, win.h)
    bubbles = homeBubbles.map((bubble, i) => {
      const slot = home.slots[i]
      return (
        <Bubble
          key={bubble.key}
          large
          dark={dancing}
          scale={home.scale}
          boxPx={bubble.key === 'about' ? home.aboutBox : undefined}
          index={i}
          slot={slot}
          label={bubble.label}
          thumb={bubble.thumb}
          thumbZoom={bubble.thumbZoom}
          icon={bubble.icon}
          onClick={() => {
            if (bubble.kind === 'ring') {
              leaveHome()
              setView({ name: 'ring', section: bubble.key, page: 0 })
            } else openDetail(terminals[bubble.key], slot, HOME)
          }}
        />
      )
    })
  } else if (view.name === 'ring') {
    const ring = ringLayout(win.w, win.h)
    const items = sections[view.section]
    const pages = Math.max(1, Math.ceil(items.length / RING_ITEMS_PER_PAGE))
    const pageItems = items.slice(view.page * RING_ITEMS_PER_PAGE, (view.page + 1) * RING_ITEMS_PER_PAGE)
    bubbles = (
      <>
        <Bubble key="back" index={0} slot={ring.slots[0]} label="Back" icon="back" tone="action" scale={NAV_SCALE} onClick={() => setView(ringBack(view))} />
        {pageItems.map((item, i) => {
          const slot = ring.slots[i + 1]
          return (
            <Bubble
              key={item.slug}
              index={i + 1}
              slot={slot}
              scale={ring.scale}
              label={item.title}
              thumb={item.thumb ?? item.images[0]}
              thumbZoom={item.thumbZoom}
              thumbScale={item.thumbScale}
              onClick={() => openDetail(item, slot, view)}
            />
          )
        })}
        {view.page < pages - 1 && (
          <Bubble
            key="more"
            index={7}
            slot={ring.slots[7]}
            label="More"
            icon="more"
            tone="action"
            scale={NAV_SCALE}
            onClick={() => setView({ ...view, page: view.page + 1 })}
          />
        )}
      </>
    )
  } else {
    const imageSide = view.side === 'left' ? 'right' : 'left'
    // The small video panel hangs under the photos; if that is the left column it
    // would sit on the usual bottom-left Back bubble, so Back moves to the other corner.
    const backSlot = hasSmallVideo(view.item) && imageSide === 'left' ? MORE_SLOT : BACK_SLOT
    bubbles = <Bubble key="back" index={0} slot={backSlot} label="Back" icon="back" tone="action" onClick={() => setView(view.returnTo)} />
    panels = (
      <>
        <TextPanel item={view.item} side={view.side} />
        <ImagePanel item={view.item} side={imageSide} />
      </>
    )
  }

  // Remount (and so re-animate) the bubbles whenever the arrangement changes.
  const viewKey = `${view.name}-${view.section ?? ''}-${view.page ?? ''}-${view.item?.slug ?? ''}`

  // Dance button geometry (px): top = bottom of the About Me caption text, bottom = the
  // arm base's bottom edge (one title margin above the page bottom). Min height 44 px.
  const homeGeom = homeLayout(win.w, win.h)
  const baseBottom = win.w >= 768 ? 48 : 24
  const aboutTextBottom = (homeGeom.slots[2].y / 100) * win.h + homeGeom.aboutBox.h / 2 + 40
  const danceTop = Math.min(aboutTextBottom, win.h - baseBottom - 44)
  // Half that height, keeping the same vertical centre (min 44 px).
  const danceSpan = win.h - baseBottom - danceTop
  const danceHeight = Math.max(danceSpan / 2, 44)
  const danceMid = danceTop + danceSpan / 2

  return (
    <div className={`relative min-h-screen w-screen transition-colors duration-1000 ${dancing ? 'bg-[#1a1e2a]' : 'bg-white'}`}>
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Arm dancing={dancing} fullReach={overDance && view.name === 'home'} />
      </div>

      {dancing && <div className="disco-wash pointer-events-none fixed inset-0 z-[1]" />}

      <div className="pointer-events-none fixed inset-0 z-10">
        <header className="pointer-events-auto fixed left-6 top-6 md:left-12 md:top-12">
          <h1 className={`text-2xl font-semibold tracking-tight transition-colors duration-1000 md:text-3xl ${dancing ? 'text-slate-100' : 'text-slate-900'}`}>Aamir Sheikh</h1>
          <p className={`mt-1 text-sm transition-colors duration-1000 md:text-base ${dancing ? 'text-slate-300' : 'text-slate-600'}`}>Mechanical Engineering · Robotics</p>
        </header>

        <div key={viewKey} className="absolute inset-0">
          {bubbles}
          {panels}
        </div>

        {view.name === 'home' && (
          <button
            type="button"
            onClick={() => setDancing((d) => !d)}
            onPointerEnter={() => setOverDance(true)}
            onPointerLeave={() => setOverDance(false)}
            aria-pressed={dancing}
            // Between the About Me bubble and the robot's base. Its centre is the middle of the
            // span from the bottom of the About Me caption text to the base's bottom edge;
            // its height is half that span.
            style={{ top: danceMid - danceHeight / 2, height: danceHeight }}
            className={`pointer-events-auto fixed left-[66%] flex w-[9.25rem] -translate-x-1/2 flex-col items-center justify-center gap-2 rounded-3xl px-3 text-center text-sm font-medium shadow-lg ring-2 transition duration-500 hover:scale-105 ${
              dancing
                ? 'bg-white/10 text-white shadow-black/40 ring-white/30 hover:bg-white/20'
                : 'bg-white text-slate-800 shadow-slate-400/50 ring-white hover:bg-slate-50'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 2v3M4.5 10h15M4.5 16h15M12 5v16M8 6.5c-1.5 3.5-1.5 8.5 0 13M16 6.5c1.5 3.5 1.5 8.5 0 13" />
            </svg>
            {dancing ? 'Stop dancing' : 'Dance mode'}
          </button>
        )}
      </div>
    </div>
  )
}

export default App
