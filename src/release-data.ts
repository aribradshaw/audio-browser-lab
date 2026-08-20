import releaseRegistry from '../config/devlog-releases.json'
import packageJson from '../package.json'
import { resolveCurrentDevLogRelease, validateDevLogEntries, type DevLogEntry } from '@aribradshaw/devlog'

export type ReleaseEntry = DevLogEntry & { summary: string }

export const currentVersion = packageJson.version

const validated = validateDevLogEntries(releaseRegistry, {
  requireAuthor: true,
  rejectAuthorEmail: true,
  rejectTicketTitle: true,
})

if (!validated || validated.some((entry) => !entry.summary)) {
  throw new Error('Audio Browser Lab has an invalid public DevLog registry.')
}

export const releases = validated as ReleaseEntry[]
export const currentRelease = resolveCurrentDevLogRelease(releases, currentVersion)

if (!currentRelease.matched) {
  throw new Error(`Audio Browser Lab ${currentVersion} is missing from the public DevLog.`)
}
