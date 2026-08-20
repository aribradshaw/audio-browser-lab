import assert from 'node:assert/strict'
import test from 'node:test'
import { nextMonthlyVersion, parseVersion } from './monthly-version.mjs'

test('parses a stable three-part release version', () => {
  assert.deepEqual(parseVersion('1.2.3'), { raw: '1.2.3', major: 1, minor: 2, patch: 3 })
  assert.throws(() => parseVersion('1.2'), /three-part version/i)
})

test('increments updates within the same Arizona month', () => {
  assert.equal(nextMonthlyVersion('1.0.3', { latestReleaseDate: '2026-08-01', releaseAt: '2026-08-19' }), '1.0.4')
})

test('advances the middle number when the Arizona month changes', () => {
  assert.equal(nextMonthlyVersion('1.0.18', { latestReleaseDate: '2026-08-31', releaseAt: '2026-09-01' }), '1.1.1')
  assert.equal(nextMonthlyVersion('1.0.18', { latestReleaseDate: '2026-08-01', releaseAt: '2026-11-01' }), '1.3.1')
})

test('advances the first number when the Arizona year changes', () => {
  assert.equal(nextMonthlyVersion('1.4.18', { latestReleaseDate: '2026-12-31', releaseAt: '2027-01-01' }), '2.0.1')
  assert.equal(nextMonthlyVersion('1.4.18', { latestReleaseDate: '2026-12-31', releaseAt: '2027-08-01' }), '2.7.1')
})
