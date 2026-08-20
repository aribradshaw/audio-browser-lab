import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const entries = JSON.parse(readFileSync(new URL('../config/devlog-releases.json', import.meta.url), 'utf8'))
const semver = /^\d+\.\d+\.\d+$/

if (!semver.test(pkg.version)) throw new Error(`Package version ${pkg.version} is not a three-part semantic version.`)
if (!Array.isArray(entries) || entries.length === 0) throw new Error('The public DevLog must contain at least one release.')
if (entries[0]?.version !== pkg.version) throw new Error(`Newest DevLog version ${entries[0]?.version} does not match package ${pkg.version}.`)

const seen = new Set()
for (const entry of entries) {
  if (!semver.test(entry.version)) throw new Error(`Invalid release version ${entry.version}.`)
  if (seen.has(entry.version)) throw new Error(`Duplicate release version ${entry.version}.`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error(`Invalid release date for ${entry.version}.`)
  if (!entry.title || !entry.summary || !Array.isArray(entry.notes) || entry.notes.length === 0) throw new Error(`Release ${entry.version} needs public-facing notes.`)
  seen.add(entry.version)
}

console.log(`Release ${pkg.version} has a valid public DevLog entry.`)
