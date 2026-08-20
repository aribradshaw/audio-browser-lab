import releaseRegistry from '../config/devlog-releases.json'

export type ReleaseEntry = {
  version: string
  date: string
  title: string
  summary: string
  notes: string[]
  commit: string
}

export const currentVersion = '1.0.5'

export const releases = releaseRegistry as ReleaseEntry[]
