import { homeBubbles, sections, terminals } from './content.v2.js'

// Loads and decodes images in priority order once the home page is up, so the
// project / design menus are already filled in when they are opened:
//   1. the home-page bubbles       (already on screen; this just makes sure)
//   2. project thumbnails          (menu order, page 1 first)
//   3. design thumbnails
//   4. everything else: remaining project / design photos, About photos
// Each tier finishes before the next starts. `img.decode()` also does the
// expensive decoding up front, so showing the image later doesn't hitch.

const CONCURRENCY = 3
const keepAlive = [] // hold references so the browser keeps the decoded images

const unique = (urls) => [...new Set(urls.filter(Boolean))]

function loadOne(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    keepAlive.push(img)
    const done = () => resolve()
    if (img.decode) img.decode().then(done, done)
    else {
      img.onload = done
      img.onerror = done
    }
  })
}

async function loadTier(urls) {
  const queue = unique(urls)
  const worker = async () => {
    while (queue.length) await loadOne(queue.shift())
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
}

let started = false

export function startPreload() {
  if (started) return
  started = true

  const thumbs = (items) => items.map((item) => item.images[0])
  const rest = (items) => items.flatMap((item) => item.images.slice(1))

  const tiers = [
    homeBubbles.map((b) => b.thumb),
    thumbs(sections.projects),
    thumbs(sections.designs),
    [
      ...rest(sections.projects),
      ...rest(sections.designs),
      ...terminals.about.images,
    ],
  ]

  // Wait for the page and the first frames (arm, home bubbles) to finish, then
  // work through the tiers in order.
  const run = async () => {
    for (const tier of tiers) await loadTier(tier)
  }
  const begin = () => requestAnimationFrame(() => requestAnimationFrame(run))
  if (document.readyState === 'complete') begin()
  else window.addEventListener('load', begin, { once: true })
}
