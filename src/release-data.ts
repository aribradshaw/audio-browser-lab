import releaseRegistry from '../config/devlog-releases.json'
import type { DevLogEntry } from '@aribradshaw/devlog'

export type ReleaseEntry = DevLogEntry & { summary: string }

export const currentVersion = '1.0.6'

export const releases = releaseRegistry as ReleaseEntry[]
