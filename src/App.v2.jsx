import { useEffect, useState } from 'react'
import Arm from './arm/Arm.v2.jsx'
import { homeBubbles, sections, terminals } from './ui/content.v2.js'
import { BACK_SLOT, MORE_SLOT, RING_ITEMS_PER_PAGE, homeSlot, ringSlot } from './ui/layout.v2.js'
import { Bubble, ImagePanel, TextPanel } from './ui/Bubbles.v2.jsx'
import { startPreload } from './ui/preload.v2.js'

// Navigation is a small state machine. The arm is always mounted and always
// live; only the bubble arrangement (and the flanking panels) change.
//   { name: 'home' }
//   { name: 'ring',   section, page }            a ring of project/design bubbles
//   { name: 'detail', item, side, returnTo }     text + images flanking the arm
const HOME = { name: 'home' }

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

  // Escape = the Back bubble.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setView((v) => (v.name === 'detail' ? v.returnTo : v.name === 'ring' ? HOME : v))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Which side of the screen a bubble sits on decides where the text goes.
  const sideOf = (slot) => (slot.x < 50 ? 'left' : 'right')
  const openDetail = (item, slot, returnTo) =>
    setView({ name: 'detail', item, side: sideOf(slot), returnTo })

  let bubbles
  let panels = null

  if (view.name === 'home') {
    bubbles = homeBubbles.map((bubble, i) => {
      const slot = homeSlot(i)
      return (
        <Bubble
          key={bubble.key}
          large
          index={i}
          slot={slot}
          label={bubble.label}
          thumb={bubble.thumb}
          icon={bubble.icon}
          onClick={() =>
            bubble.kind === 'ring'
              ? setView({ name: 'ring', section: bubble.key, page: 0 })
              : openDetail(terminals[bubble.key], slot, HOME)
          }
        />
      )
    })
  } else if (view.name === 'ring') {
    const items = sections[view.section]
    const pages = Math.max(1, Math.ceil(items.length / RING_ITEMS_PER_PAGE))
    const pageItems = items.slice(view.page * RING_ITEMS_PER_PAGE, (view.page + 1) * RING_ITEMS_PER_PAGE)
    bubbles = (
      <>
        <Bubble key="back" index={0} slot={BACK_SLOT} label="Back" icon="back" tone="action" onClick={() => setView(HOME)} />
        {pageItems.map((item, i) => {
          const slot = ringSlot(i + 1)
          return (
            <Bubble
              key={item.slug}
              index={i + 1}
              slot={slot}
              label={item.title}
              thumb={item.images[0]}
              onClick={() => openDetail(item, slot, view)}
            />
          )
        })}
        {pages > 1 && (
          <Bubble
            key="more"
            index={7}
            slot={MORE_SLOT}
            label="More"
            icon="more"
            tone="action"
            onClick={() => setView({ ...view, page: (view.page + 1) % pages })}
          />
        )}
      </>
    )
  } else {
    const imageSide = view.side === 'left' ? 'right' : 'left'
    bubbles = <Bubble key="back" index={0} slot={BACK_SLOT} label="Back" icon="back" tone="action" onClick={() => setView(view.returnTo)} />
    panels = (
      <>
        <TextPanel item={view.item} side={view.side} />
        <ImagePanel item={view.item} side={imageSide} />
      </>
    )
  }

  // Remount (and so re-animate) the bubbles whenever the arrangement changes.
  const viewKey = `${view.name}-${view.section ?? ''}-${view.page ?? ''}-${view.item?.slug ?? ''}`

  return (
    <div className="relative min-h-screen w-screen bg-white">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Arm />
      </div>

      <div className="pointer-events-none fixed inset-0 z-10">
        <header className="pointer-events-auto fixed left-6 top-6 md:left-12 md:top-12">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Aamir Sheikh</h1>
          <p className="mt-1 text-sm text-slate-600 md:text-base">Mechanical Engineering · Robotics</p>
        </header>

        <div key={viewKey} className="absolute inset-0">
          {bubbles}
          {panels}
        </div>
      </div>
    </div>
  )
}

export default App
