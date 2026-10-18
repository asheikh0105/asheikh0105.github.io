// Turns photo_vid_uploads/<slug>/ (originals, kept out of the bundle) into
// web-sized files in public/media/<slug>/ plus src/ui/media.v2.json.
//   thumbnail.*   -> bubble thumbnail AND first slide of the carousel
//   other photos  -> carousel (old-N first, then the rest, natural order)
//   videos        -> one web mp4 each (720p, H.264)
// Exact duplicate files (e.g. "IMG_1(1).JPG") are skipped. Existing outputs
// are reused, so re-running only processes new or changed files.
// Usage: node scripts/build-media.mjs
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SRC = 'photo_vid_uploads'
const OUT = 'public/media'
const MANIFEST = 'src/ui/media.v2.json'

// Folders whose thumbnail is the bubble image only (not repeated in the carousel).
const THUMB_NOT_IN_CAROUSEL = new Set(['electronics-mounting-rack'])

const PHOTO = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif'])
const VIDEO = new Set(['.mov', '.mp4', '.m4v', '.webm'])
const natural = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

const ffmpeg = (args) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] })
  return r.status === 0
}
const fresh = (out, src) => existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs
const md5 = (file) => createHash('md5').update(readFileSync(file)).digest('hex')

// ffmpeg can't decode iPhone HEIC, so go through Python (pillow-heif) first.
function heicToJpg(src) {
  const tmp = path.join(os.tmpdir(), `heic-${md5(src)}.jpg`)
  if (!existsSync(tmp)) {
    const py = process.env.PYTHON ?? 'python'
    const r = spawnSync(py, [path.join('scripts', 'heic_to_jpg.py'), src, tmp], { stdio: 'inherit' })
    if (r.status !== 0) return null
  }
  return tmp
}

function photo(source, out, width) {
  if (fresh(out, source)) return true
  let src = source
  if (/\.hei[cf]$/i.test(src)) src = heicToJpg(src)
  if (!src) return false
  const vf = `scale='min(${width},iw)':-2`
  return ffmpeg(['-i', src, '-vf', vf, ...(out.endsWith('.jpg') ? ['-q:v', '3'] : []), '-frames:v', '1', out])
}

function video(src, out) {
  if (fresh(out, src)) return true
  console.log(`  encoding ${path.basename(src)} (${(statSync(src).size / 1e6).toFixed(0)} MB)...`)
  return ffmpeg([
    '-i', src, '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', "scale=-2:'min(720,ih)'", '-c:v', 'libx264', '-crf', '27', '-preset', 'fast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out,
  ])
}

const manifest = {}
for (const slug of readdirSync(SRC).sort()) {
  const dir = path.join(SRC, slug)
  if (!statSync(dir).isDirectory()) continue

  const seen = new Set()
  const photos = []
  const videos = []
  let thumbFile = null
  for (const name of readdirSync(dir).sort(natural.compare)) {
    const file = path.join(dir, name)
    const ext = path.extname(name).toLowerCase()
    if (PHOTO.has(ext)) {
      const hash = md5(file)
      if (seen.has(hash)) continue
      seen.add(hash)
      if (/^thumbnail\./i.test(name)) thumbFile = file
      else photos.push(file)
    } else if (VIDEO.has(ext)) videos.push(file)
  }
  // old-N first (the original site photos), then new uploads
  photos.sort((a, b) => {
    const ao = /^old-/i.test(path.basename(a))
    const bo = /^old-/i.test(path.basename(b))
    return ao === bo ? natural.compare(a, b) : ao ? -1 : 1
  })
  const slides = thumbFile && !THUMB_NOT_IN_CAROUSEL.has(slug) ? [thumbFile, ...photos] : photos
  const thumbSrc = thumbFile ?? slides[0]
  if (!slides.length && !videos.length && !thumbFile) continue

  console.log(slug)
  const outDir = path.join(OUT, slug)
  mkdirSync(outDir, { recursive: true })
  // photos are cheap to redo and their numbering shifts when files change: start clean (videos are kept)
  for (const f of readdirSync(outDir)) if (!f.endsWith('.mp4')) rmSync(path.join(outDir, f))
  const url = (f) => `/media/${slug}/${f}`
  const entry = { thumb: null, images: [], videos: [] }

  slides.forEach((src, i) => {
    const ext = path.extname(src).toLowerCase() === '.png' ? 'png' : 'jpg'
    const name = `p${i}.${ext}`
    if (photo(src, path.join(outDir, name), 1600)) entry.images.push(url(name))
    else console.log(`  FAILED ${path.basename(src)}`)
  })
  if (thumbSrc && photo(thumbSrc, path.join(outDir, 't.jpg'), 800)) entry.thumb = url('t.jpg')
  videos.forEach((src, i) => {
    const name = `v${i}.mp4`
    if (video(src, path.join(outDir, name))) entry.videos.push(url(name))
    else console.log(`  FAILED ${path.basename(src)}`)
  })
  manifest[slug] = entry
}
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
console.log(`wrote ${MANIFEST}`)
