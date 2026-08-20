const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export const RELEASE_TIME_ZONE = 'America/Phoenix'

export function parseVersion(value) {
  const version = String(value ?? '').trim()
  const match = SEMVER_PATTERN.exec(version)
  if (!match) throw new Error(`Expected a stable three-part version, received "${version}".`)
  return { raw: version, major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) }
}

function calendarMonth(value, timeZone = RELEASE_TIME_ZONE) {
  const dateOnly = DATE_ONLY_PATTERN.exec(String(value ?? '').trim())
  if (dateOnly) return { year: Number(dateOnly[1]), month: Number(dateOnly[2]) }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Expected a valid release date, received "${value}".`)
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' }).formatToParts(date)
  return {
    year: Number(parts.find((part) => part.type === 'year')?.value),
    month: Number(parts.find((part) => part.type === 'month')?.value),
  }
}

export function nextMonthlyVersion(currentVersion, { latestReleaseDate = '', releaseAt = new Date().toISOString(), timeZone = RELEASE_TIME_ZONE } = {}) {
  const current = parseVersion(currentVersion)
  if (!latestReleaseDate) return `${current.major}.${current.minor}.${current.patch + 1}`

  const latestMonth = calendarMonth(latestReleaseDate, timeZone)
  const releaseMonth = calendarMonth(releaseAt, timeZone)
  const monthDelta = (releaseMonth.year - latestMonth.year) * 12 + (releaseMonth.month - latestMonth.month)
  if (monthDelta <= 0) return `${current.major}.${current.minor}.${current.patch + 1}`

  const yearDelta = releaseMonth.year - latestMonth.year
  if (yearDelta > 0) return `${current.major + yearDelta}.${releaseMonth.month - 1}.1`
  return `${current.major}.${current.minor + monthDelta}.1`
}
