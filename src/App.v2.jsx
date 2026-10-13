import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Arm from './arm/Arm.v2.jsx'
import content from '../old_site_data/content.json'

// Bundles every harvested photo so it's available (and correctly hashed) in
// both dev and production builds, keyed by the same relative path used in
// content.json (e.g. "images/coil-winder/1.jpg").
const imageModules = import.meta.glob('../old_site_data/images/**/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
})

function resolveImage(relativePath) {
  if (!relativePath) return null
  return imageModules[`../old_site_data/${relativePath}`] ?? null
}

const PROJECTS_PAGE_SIZE = 8

// Home-screen menu cards, arranged in an arc around the arm.
const homeCards = [
  {
    key: 'projects',
    title: 'Projects',
    description: 'Robotics, controls, and mechanical design work.',
    position: 'top-[38%] left-[29%] -translate-x-1/2 -translate-y-1/2',
  },
  {
    key: 'about',
    title: 'About',
    description: 'Mechanical engineering, robotics, BU.',
    position: 'top-[11%] left-1/2 -translate-x-1/2 -translate-y-1/2',
  },
  {
    key: 'contact',
    title: 'Contact',
    description: "Let's get in touch.",
    position: 'top-[38%] left-[71%] -translate-x-1/2 -translate-y-1/2',
  },
]

// Maps a panel's full-size box onto a smaller origin rect (the card that was
// clicked), expressed as a translate+scale transform. Applying this, then
// clearing it, is what produces the "zoom into the container" effect.
function computeOriginTransform(origin, rect) {
  const scaleX = origin.width / rect.width
  const scaleY = origin.height / rect.height
  const dx = origin.left + origin.width / 2 - (rect.left + rect.width / 2)
  const dy = origin.top + origin.height / 2 - (rect.top + rect.height / 2)
  return `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`
}

function ZoomPanel({ origin, fullScreen, closing, onRequestClose, onClosed, children }) {
  const panelRef = useRef(null)

  // Entrance: snap to the origin card's position/size with no transition,
  // force a reflow, then clear the transform so it animates to full size.
  useLayoutEffect(() => {
    const el = panelRef.current
    if (!el || !origin) return
    const rect = el.getBoundingClientRect()
    el.style.transition = 'none'
    el.style.transform = computeOriginTransform(origin, rect)
    el.style.opacity = '0'
    void el.offsetHeight
    requestAnimationFrame(() => {
      el.style.transition = ''
      el.style.transform = ''
      el.style.opacity = '1'
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Exit: animate back toward the origin rect once a close is requested.
  useEffect(() => {
    if (!closing) return
    const el = panelRef.current
    if (!el || !origin) {
      onClosed()
      return
    }
    const rect = el.getBoundingClientRect()
    el.style.transform = computeOriginTransform(origin, rect)
    el.style.opacity = '0'
  }, [closing, origin, onClosed])

  function handleTransitionEnd(event) {
    if (event.target !== panelRef.current) return
    if (closing) onClosed()
  }

  return (
    <div
      ref={panelRef}
      onTransitionEnd={handleTransitionEnd}
      className={`pointer-events-auto fixed z-20 flex flex-col overflow-hidden border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/60 backdrop-blur-md transition-[transform,opacity] duration-500 ease-out ${
        fullScreen ? 'inset-0' : 'inset-[6%] rounded-3xl'
      }`}
    >
      <button
        type="button"
        onClick={onRequestClose}
        className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10"
      >
        ← Back
      </button>
      <div className="h-full w-full overflow-y-auto px-8 pb-10 pt-16 md:px-16">{children}</div>
    </div>
  )
}

function ProjectsGrid({ page, onOpenProject, onMore }) {
  const total = content.projects.length
  const visibleCount = Math.min(PROJECTS_PAGE_SIZE * (page + 1), total)
  const visibleProjects = content.projects.slice(0, visibleCount)
  const hasMore = visibleCount < total

  return (
    <div>
      <h2 className="text-2xl font-semibold text-white md:text-3xl">Projects</h2>
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleProjects.map((project) => (
          <button
            key={project.slug}
            type="button"
            onClick={(event) => onOpenProject(project.slug, event.currentTarget.getBoundingClientRect())}
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left transition hover:border-white/20 hover:bg-white/10"
          >
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-800">
              {project.images[0] && (
                <img
                  src={resolveImage(project.images[0])}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              )}
            </div>
            <div className="p-4">
              <h3 className="text-base font-medium text-white">{project.title}</h3>
              {project.summary && (
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{project.summary}</p>
              )}
            </div>
          </button>
        ))}

        {hasMore && (
          <button
            type="button"
            onClick={onMore}
            className="flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-slate-300 transition hover:border-white/40 hover:bg-white/10"
          >
            <span className="text-lg font-medium">See more</span>
            <span className="mt-1 text-sm text-slate-400">
              {total - visibleCount} more project{total - visibleCount === 1 ? '' : 's'}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

function ProjectDetail({ slug }) {
  const project = content.projects.find((p) => p.slug === slug)
  if (!project) return null

  const paragraphs = (project.description ?? '').split('\n\n').filter(Boolean)

  return (
    <article className="mx-auto max-w-3xl">
      <h2 className="text-3xl font-semibold text-white md:text-4xl">{project.title}</h2>
      {project.summary && <p className="mt-2 text-lg text-slate-300">{project.summary}</p>}
      {project.date && <p className="mt-1 text-sm text-slate-500">{project.date}</p>}

      {project.images.length > 0 && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {project.images.map((img) => (
            <img
              key={img}
              src={resolveImage(img)}
              alt=""
              className="w-full rounded-xl border border-white/10 object-cover"
            />
          ))}
        </div>
      )}

      {paragraphs.length > 0 && (
        <div className="mt-8 space-y-4 text-slate-300">
          {paragraphs.map((para, i) => (
            <p key={i} className="whitespace-pre-line leading-relaxed">
              {para}
            </p>
          ))}
        </div>
      )}

      {project.media_note && (
        <p className="mt-6 text-sm italic text-slate-500">{project.media_note}</p>
      )}
    </article>
  )
}

function AboutPanel() {
  const about = content.about
  const photo = resolveImage(about.images?.profile_photo)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {photo && (
          <img
            src={photo}
            alt="Aamir Sheikh"
            className="h-40 w-40 flex-shrink-0 rounded-2xl border border-white/10 object-cover"
          />
        )}
        <div>
          <h2 className="text-3xl font-semibold text-white md:text-4xl">About</h2>
          {about.certifications && (
            <p className="mt-1 text-sm text-slate-400">{about.certifications}</p>
          )}
        </div>
      </div>

      <div className="mt-8 space-y-4 text-slate-300">
        {about.bio.map((para, i) => (
          <p key={i} className="leading-relaxed">
            {para}
          </p>
        ))}
      </div>
    </div>
  )
}

function ContactPanel() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-3xl font-semibold text-white md:text-4xl">Contact</h2>
      <p className="mt-4 text-slate-300">Contact details go here — email, LinkedIn, GitHub, etc.</p>
      <p className="mt-2 text-sm text-slate-500">
        (Placeholder — tell me what you'd like listed here and I'll wire it in.)
      </p>
    </div>
  )
}

function App() {
  // Lock browser zoom (ctrl/cmd +, -, 0 and ctrl+wheel, plus Safari pinch) so
  // the fixed-position cards keep their layout. Zoom from the browser menu
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

  const [navStack, setNavStack] = useState([{ type: 'home' }])
  const [closing, setClosing] = useState(false)

  const current = navStack[navStack.length - 1]
  const onHome = current.type === 'home'

  function openScreen(type, event, extra = {}) {
    const origin = event.currentTarget.getBoundingClientRect()
    setNavStack((stack) => [...stack, { type, origin, ...extra }])
  }

  function requestClose() {
    setClosing(true)
  }

  function handleClosed() {
    setClosing(false)
    setNavStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack))
  }

  function setProjectsPage(page) {
    setNavStack((stack) => {
      const next = [...stack]
      next[next.length - 1] = { ...next[next.length - 1], page }
      return next
    })
  }

  return (
    <div className="relative min-h-screen w-screen bg-white">
      <div className="fixed inset-0 z-0 overflow-hidden">
        <Arm paused={!onHome} />
        <div
          className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-500 ${
            onHome ? 'opacity-0' : 'opacity-60'
          }`}
        />
      </div>

      {!onHome && (
        <button
          type="button"
          aria-label="Close"
          onClick={requestClose}
          className="pointer-events-auto fixed inset-0 z-10 cursor-default"
        />
      )}

      <div className="pointer-events-none fixed inset-0 z-10">
        <header className="pointer-events-auto fixed left-6 top-6 md:left-12 md:top-12">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Aamir Sheikh</h1>
          <p className="mt-1 text-sm text-slate-600 md:text-base">Mechanical Engineering · Robotics</p>
        </header>

        {onHome &&
          homeCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={(event) => openScreen(card.key, event)}
              className={`pointer-events-auto fixed w-48 rounded-2xl border border-slate-300 bg-white/70 p-6 text-center shadow-lg shadow-slate-400/30 backdrop-blur-md transition hover:border-slate-400 hover:bg-white md:w-56 ${card.position}`}
            >
              <h2 className="text-lg font-medium text-slate-900">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{card.description}</p>
            </button>
          ))}
      </div>

      {current.type === 'projects' && (
        <ZoomPanel
          origin={current.origin}
          closing={closing}
          onRequestClose={requestClose}
          onClosed={handleClosed}
        >
          <ProjectsGrid
            page={current.page ?? 0}
            onOpenProject={(slug, rect) =>
              setNavStack((stack) => [...stack, { type: 'project', slug, origin: rect }])
            }
            onMore={() => setProjectsPage((current.page ?? 0) + 1)}
          />
        </ZoomPanel>
      )}

      {current.type === 'about' && (
        <ZoomPanel
          origin={current.origin}
          closing={closing}
          onRequestClose={requestClose}
          onClosed={handleClosed}
        >
          <AboutPanel />
        </ZoomPanel>
      )}

      {current.type === 'contact' && (
        <ZoomPanel
          origin={current.origin}
          closing={closing}
          onRequestClose={requestClose}
          onClosed={handleClosed}
        >
          <ContactPanel />
        </ZoomPanel>
      )}

      {current.type === 'project' && (
        <ZoomPanel
          origin={current.origin}
          fullScreen
          closing={closing}
          onRequestClose={requestClose}
          onClosed={handleClosed}
        >
          <ProjectDetail slug={current.slug} />
        </ZoomPanel>
      )}
    </div>
  )
}

export default App
