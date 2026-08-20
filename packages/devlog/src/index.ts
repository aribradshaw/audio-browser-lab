export type DevLogVisibility = 'public' | 'private'

export type DevLogAuthor = {
  name: string
  githubLogin?: string | null
  avatarUrl?: string | null
  profileUrl?: string | null
}

export type DevLogIncludedCommit = {
  sha: string
  subject: string
  committedAt?: string | null
}

export type DevLogEntry = {
  version: string
  date: string
  title: string
  notes: string[]
  summary?: string
  sourceSubject?: string
  commit?: string | null
  author?: DevLogAuthor | null
  includedCommits?: DevLogIncludedCommit[]
}

export type DevLogCapabilities = {
  visibility: DevLogVisibility
  author: boolean
  commit: boolean
  sourceSubject: boolean
  includedCommits: boolean
  lifecycle: boolean
  search: boolean
  pagination: boolean
}

export type DevLogSourceMeta = {
  author: (DevLogAuthor & { initials: string; avatarUrl: string | null; profileUrl: string | null }) | null
  commit: { sha: string; shortSha: string; url: string } | null
}

const FULL_COMMIT_RE = /^[a-f0-9]{40}$/i
const GITHUB_LOGIN_RE = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i

export const PUBLIC_DEVLOG_CAPABILITIES: DevLogCapabilities = {
  visibility: 'public',
  author: true,
  commit: true,
  sourceSubject: false,
  includedCommits: false,
  lifecycle: false,
  search: false,
  pagination: false,
}

export const PRIVATE_DEVLOG_CAPABILITIES: DevLogCapabilities = {
  visibility: 'private',
  author: true,
  commit: true,
  sourceSubject: true,
  includedCommits: true,
  lifecycle: true,
  search: true,
  pagination: true,
}

export function createDevLogCapabilities(overrides: Partial<DevLogCapabilities> = {}): DevLogCapabilities {
  const baseline = overrides.visibility === 'private' ? PRIVATE_DEVLOG_CAPABILITIES : PUBLIC_DEVLOG_CAPABILITIES
  return { ...baseline, ...overrides }
}

export function authorInitials(name: string): string {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export function resolveDevLogAuthor(author?: DevLogAuthor | null): DevLogSourceMeta['author'] {
  const name = String(author?.name || '').trim()
  if (!name) return null
  const githubLogin = String(author?.githubLogin || '').trim()
  const validLogin = GITHUB_LOGIN_RE.test(githubLogin) ? githubLogin : null
  return {
    name,
    githubLogin: validLogin,
    initials: authorInitials(name),
    avatarUrl: author?.avatarUrl || (validLogin ? `https://github.com/${validLogin}.png?size=64` : null),
    profileUrl: author?.profileUrl || (validLogin ? `https://github.com/${validLogin}` : null),
  }
}

export function resolveDevLogCommit(
  entry: Pick<DevLogEntry, 'version' | 'commit'>,
  currentVersion: string,
  buildCommit = '',
): string | null {
  const recorded = String(entry.commit || '').trim().toLowerCase()
  if (FULL_COMMIT_RE.test(recorded)) return recorded
  const current = String(buildCommit || '').trim().toLowerCase()
  if (entry.version === currentVersion && FULL_COMMIT_RE.test(current)) return current
  return null
}

export function resolveDevLogSourceMeta(
  entry: DevLogEntry,
  options: {
    repositoryUrl: string
    currentVersion: string
    buildCommit?: string
    capabilities?: Partial<DevLogCapabilities>
  },
): DevLogSourceMeta {
  const capabilities = createDevLogCapabilities(options.capabilities)
  const author = capabilities.author ? resolveDevLogAuthor(entry.author) : null
  const sha = capabilities.commit
    ? resolveDevLogCommit(entry, options.currentVersion, options.buildCommit)
    : null
  return {
    author,
    commit: sha
      ? {
          sha,
          shortSha: sha.slice(0, 7),
          url: `${options.repositoryUrl.replace(/\/$/, '')}/commit/${sha}`,
        }
      : null,
  }
}

export function filterDevLogEntries(entries: DevLogEntry[], query: unknown): DevLogEntry[] {
  const terms = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return entries
  return entries.filter((entry) => {
    const searchable = [
      entry.version,
      entry.date,
      entry.title,
      entry.summary || '',
      entry.sourceSubject || '',
      entry.commit || '',
      entry.author?.name || '',
      entry.author?.githubLogin || '',
      ...entry.notes,
    ].join(' ').toLowerCase()
    return terms.every((term) => searchable.includes(term))
  })
}

export function paginateDevLogEntries(entries: DevLogEntry[], page: number, pageSize = 10): DevLogEntry[] {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.max(1, Number(pageSize) || 10)
  return entries.slice((safePage - 1) * safePageSize, safePage * safePageSize)
}
