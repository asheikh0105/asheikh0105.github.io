import content from '../../old_site_data/content.json'

// Bundles every harvested photo so it's available (and correctly hashed) in
// both dev and production builds, keyed by the same relative path used in
// content.json (e.g. "images/coil-winder/1.jpg").
const imageModules = import.meta.glob('../../old_site_data/images/**/*.{jpg,jpeg,png}', {
  eager: true,
  import: 'default',
})

export function resolveImage(relativePath) {
  if (!relativePath) return null
  return imageModules[`../../old_site_data/${relativePath}`] ?? null
}

const paragraphs = (text) => (text ?? '').split('\n\n').filter(Boolean)

// Every terminal bubble (a project, a design, About, Contact) is normalised to
// the same shape so one detail layout can show any of them:
//   { slug, title, subtitle, date, paragraphs[], images[] (resolved urls), note }
const projects = content.projects.map((p) => ({
  slug: p.slug,
  title: p.title,
  subtitle: p.summary,
  date: p.date,
  paragraphs: paragraphs(p.description),
  images: (p.images ?? []).map(resolveImage).filter(Boolean),
  note: p.media_note,
}))

const designs = content.models_and_designs.items.map((d) => ({
  slug: d.slug,
  title: d.title,
  paragraphs: paragraphs(d.description),
  images: (d.images ?? []).map(resolveImage).filter(Boolean),
}))

const about = {
  slug: 'about',
  title: 'About',
  subtitle: content.about.certifications,
  paragraphs: content.about.bio,
  images: Object.values(content.about.images ?? {}).map(resolveImage).filter(Boolean),
}

const contact = {
  slug: 'contact',
  title: 'Contact',
  paragraphs: ['Contact details go here: email, LinkedIn, GitHub, etc.'],
  images: [],
  note: 'Placeholder: tell me what to list here and I will wire it in.',
}

export const sections = { projects, designs }
export const terminals = { about, contact }

// The four bubbles on the home screen, left to right.
export const homeBubbles = [
  { key: 'projects', label: 'Projects', kind: 'ring', thumb: projects.find((p) => p.images[0])?.images[0] },
  { key: 'designs', label: 'Designs', kind: 'ring', thumb: designs.find((d) => d.images[0])?.images[0] },
  { key: 'about', label: 'About', kind: 'terminal', thumb: about.images[0] },
  { key: 'contact', label: 'Contact', kind: 'terminal', icon: 'mail' },
]
