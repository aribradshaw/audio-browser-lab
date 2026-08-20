import { describe, expect, it } from 'vitest'
import {
  createDevLogCapabilities,
  filterDevLogEntries,
  paginateDevLogEntries,
  resolveDevLogSourceMeta,
  type DevLogEntry,
} from '../src'

const release: DevLogEntry = {
  version: '1.0.2',
  date: '2026-08-19',
  title: 'Show the source',
  summary: 'Adds portable source metadata.',
  notes: ['Shows the author and commit.'],
  commit: 'a'.repeat(40),
  author: { name: 'Ari Bradshaw', githubLogin: 'aribradshaw' },
}

describe('DevLog capabilities', () => {
  it('keeps public and private features independently configurable', () => {
    expect(createDevLogCapabilities()).toMatchObject({ visibility: 'public', author: true, lifecycle: false })
    expect(createDevLogCapabilities({ visibility: 'private', commit: false })).toMatchObject({ visibility: 'private', commit: false, lifecycle: true })
  })
})

describe('DevLog source metadata', () => {
  it('resolves a GitHub avatar, profile, and linked short commit', () => {
    expect(resolveDevLogSourceMeta(release, {
      repositoryUrl: 'https://github.com/aribradshaw/example',
      currentVersion: release.version,
    })).toEqual({
      author: {
        name: 'Ari Bradshaw',
        githubLogin: 'aribradshaw',
        initials: 'AB',
        avatarUrl: 'https://github.com/aribradshaw.png?size=64',
        profileUrl: 'https://github.com/aribradshaw',
      },
      commit: {
        sha: 'a'.repeat(40),
        shortSha: 'aaaaaaa',
        url: `https://github.com/aribradshaw/example/commit/${'a'.repeat(40)}`,
      },
    })
  })

  it('uses the build SHA only for the current release', () => {
    const current = { ...release, commit: null }
    expect(resolveDevLogSourceMeta(current, {
      repositoryUrl: 'https://github.com/aribradshaw/example',
      currentVersion: current.version,
      buildCommit: 'b'.repeat(40),
    }).commit?.sha).toBe('b'.repeat(40))
    expect(resolveDevLogSourceMeta(current, {
      repositoryUrl: 'https://github.com/aribradshaw/example',
      currentVersion: '9.9.9',
      buildCommit: 'b'.repeat(40),
    }).commit).toBeNull()
  })
})

describe('DevLog collection helpers', () => {
  const entries = [release, {
    ...release,
    version: '1.0.1',
    title: 'First release',
    summary: 'Initial project version.',
    notes: ['Published the first release.'],
  }]

  it('filters across release and source metadata', () => {
    expect(filterDevLogEntries(entries, 'ari source')).toEqual([release])
  })

  it('paginates without coupling to a UI framework', () => {
    expect(paginateDevLogEntries(entries, 2, 1)).toEqual([entries[1]])
  })
})
