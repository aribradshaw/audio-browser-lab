import { readFileSync } from 'node:fs'
import { nextMonthlyVersion } from './monthly-version.mjs'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const entries = JSON.parse(readFileSync(new URL('../config/devlog-releases.json', import.meta.url), 'utf8'))
const semver = /^\d+\.\d+\.\d+$/
const fullCommit = /^[a-f0-9]{40}$/i
const githubLogin = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i

if (!semver.test(pkg.version)) throw new Error(`Package version ${pkg.version} is not a three-part semantic version.`)
if (!Array.isArray(entries) || entries.length === 0) throw new Error('The public DevLog must contain at least one release.')
if (entries[0]?.version !== pkg.version) throw new Error(`Newest DevLog version ${entries[0]?.version} does not match package ${pkg.version}.`)

const seen = new Set()
for (const entry of entries) {
  if (!semver.test(entry.version)) throw new Error(`Invalid release version ${entry.version}.`)
  if (seen.has(entry.version)) throw new Error(`Duplicate release version ${entry.version}.`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error(`Invalid release date for ${entry.version}.`)
  if (!entry.title || !entry.summary || !Array.isArray(entry.notes) || entry.notes.length === 0) throw new Error(`Release ${entry.version} needs public-facing notes.`)
  if (entry.commit !== null && !fullCommit.test(entry.commit)) throw new Error(`Release ${entry.version} needs a full commit SHA or null for the current CI build.`)
  if (!entry.author?.name || !githubLogin.test(entry.author?.githubLogin || '')) throw new Error(`Release ${entry.version} needs a public author name and GitHub login.`)
  seen.add(entry.version)
}

const chronological = [...entries].reverse()
for (let index = 1; index < chronological.length; index += 1) {
  const previous = chronological[index - 1]
  const current = chronological[index]
  const expected = nextMonthlyVersion(previous.version, {
    latestReleaseDate: previous.date,
    releaseAt: current.date,
  })
  if (current.version !== expected) {
    throw new Error(`Release ${current.version} breaks the monthly sequence; expected ${expected}.`)
  }
}

console.log(`Release ${pkg.version} has a valid public DevLog entry.`)
