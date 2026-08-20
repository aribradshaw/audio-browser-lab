import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDir, '..')
const publicDir = path.join(projectRoot, 'public')
const siteUrl = (process.env.SITE_URL || 'https://aribradshaw.github.io/audio-browser-lab').replace(/\/+$/, '')

const excludedDirectories = new Set(['.git', 'dist', 'node_modules', 'public', 'packages', 'docs', 'test-fixtures'])
function collectHtmlEntries(directory, relativeDirectory = '') {
  const entries = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) entries.push(...collectHtmlEntries(path.join(directory, entry.name), path.join(relativeDirectory, entry.name)))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.html')) entries.push(path.join(relativeDirectory, entry.name))
  }
  return entries
}

const pages = collectHtmlEntries(projectRoot)
  .map((entry) => entry === 'index.html' ? '/' : entry.endsWith(`${path.sep}index.html`) ? `/${entry.slice(0, -'index.html'.length).replaceAll(path.sep, '/')}` : `/${entry.replaceAll(path.sep, '/')}`)
  .sort()

const entries = pages.map((page) => `  <url><loc>${siteUrl}${page}</loc></url>`).join('\n')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`

fs.mkdirSync(publicDir, { recursive: true })
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap)
console.log(`Generated sitemap.xml with ${pages.length} URLs.`)
