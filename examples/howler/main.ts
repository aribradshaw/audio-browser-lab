import { Howl, Howler } from 'howler'
import { observeHowl } from '@audio-browser-lab/howler'
import { buildIntegrationReport, downloadReport, fixtureUrl, renderReport } from '../shared/report'
import '../shared/example.css'

const status = document.querySelector<HTMLElement>('#example-status')!
const backend = document.querySelector<HTMLElement>('#metric-backend')!
const duration = document.querySelector<HTMLElement>('#metric-duration')!
const position = document.querySelector<HTMLElement>('#metric-position')!
const output = document.querySelector<HTMLElement>('#report-output')!
const controls = Array.from(document.querySelectorAll<HTMLButtonElement>('.controls button'))

function setStatus(message: string, state: 'loading' | 'ready' | 'error' = 'loading') {
  status.textContent = message
  status.dataset.state = state
}

const howl = new Howl({ src: [fixtureUrl], preload: false, html5: false })
const observer = observeHowl(howl, {
  usingWebAudio: Howler.usingWebAudio,
  source: fixtureUrl,
})

function updateMetrics() {
  const snapshot = observer.snapshot()
  backend.textContent = snapshot.backend || 'unknown'
  duration.textContent = `${(snapshot.duration || 0).toFixed(2)} s`
  position.textContent = `${(snapshot.currentTime || 0).toFixed(2)} s`
}

howl.once('load', () => {
  controls.forEach((control) => { control.disabled = false })
  updateMetrics()
  setStatus('Ready', 'ready')
})
howl.once('loaderror', (_id, error) => {
  setStatus(`Load failed: ${String(error)}`, 'error')
})
howl.load()

document.querySelector<HTMLButtonElement>('#play-button')!.addEventListener('click', () => { howl.play(); updateMetrics() })
document.querySelector<HTMLButtonElement>('#pause-button')!.addEventListener('click', () => { howl.pause(); updateMetrics() })
document.querySelector<HTMLButtonElement>('#seek-button')!.addEventListener('click', () => {
  howl.seek(howl.duration() / 2)
  updateMetrics()
})
document.querySelector<HTMLButtonElement>('#export-button')!.addEventListener('click', async () => {
  try {
    setStatus('Building report')
    const report = await buildIntegrationReport(observer.snapshot())
    renderReport(output, report)
    downloadReport(report, 'howler')
    setStatus('Ready', 'ready')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error')
  }
})

const metricTimer = window.setInterval(updateMetrics, 250)
window.addEventListener('beforeunload', () => {
  window.clearInterval(metricTimer)
  observer.stop()
  howl.unload()
})
