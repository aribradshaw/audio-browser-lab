import { analyzeBrowserFile } from '@audio-browser-lab/browser'
import { diagnoseReport, type AudioBrowserReport, type IntegrationEvidence } from '@audio-browser-lab/core'

export const fixtureUrl = new URL('../../test-fixtures/vbr-indexed.mp3', window.location.href).href

async function fixtureFile() {
  const response = await fetch(fixtureUrl)
  if (!response.ok) throw new Error(`Fixture request failed with HTTP ${response.status}.`)
  const blob = await response.blob()
  return new File([blob], 'vbr-indexed.mp3', { type: 'audio/mpeg', lastModified: 0 })
}

export async function buildIntegrationReport(integration: IntegrationEvidence): Promise<AudioBrowserReport> {
  const report = await analyzeBrowserFile(await fixtureFile(), {
    decode: false,
    seekTargets: [],
  })
  const merged = { ...report, integration }
  return { ...merged, findings: diagnoseReport(merged) }
}

export function renderReport(output: HTMLElement, report: AudioBrowserReport) {
  output.textContent = JSON.stringify(report, null, 2)
}

export function downloadReport(report: AudioBrowserReport, library: IntegrationEvidence['library']) {
  const objectUrl = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `audio-browser-lab-${library}-report.json`
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
