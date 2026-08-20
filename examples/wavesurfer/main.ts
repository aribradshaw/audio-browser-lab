import WaveSurfer from 'wavesurfer.js'
import { observeWaveSurfer } from '@audio-browser-lab/wavesurfer'
import { buildIntegrationReport, downloadReport, fixtureUrl, renderReport } from '../shared/report'
import '../shared/example.css'

const status = document.querySelector<HTMLElement>('#example-status')!
const duration = document.querySelector<HTMLElement>('#metric-duration')!
const position = document.querySelector<HTMLElement>('#metric-position')!
const output = document.querySelector<HTMLElement>('#report-output')!
const controls = Array.from(document.querySelectorAll<HTMLButtonElement>('.controls button'))

function setStatus(message: string, state: 'loading' | 'ready' | 'error' = 'loading') {
  status.textContent = message
  status.dataset.state = state
}

const wavesurfer = WaveSurfer.create({
  container: '#waveform',
  height: 96,
  waveColor: '#7b927f',
  progressColor: '#315e37',
  cursorColor: '#17251b',
  normalize: true,
})
const observer = observeWaveSurfer(wavesurfer, { backend: 'media-element', source: fixtureUrl })

function updateMetrics() {
  const snapshot = observer.snapshot()
  duration.textContent = `${(snapshot.duration || 0).toFixed(2)} s`
  position.textContent = `${(snapshot.currentTime || 0).toFixed(2)} s`
}

wavesurfer.once('ready', () => {
  controls.forEach((control) => { control.disabled = false })
  updateMetrics()
  setStatus('Ready', 'ready')
})
wavesurfer.once('error', (error) => {
  setStatus(`Load failed: ${error.message}`, 'error')
})
void wavesurfer.load(fixtureUrl)

document.querySelector<HTMLButtonElement>('#play-button')!.addEventListener('click', () => { void wavesurfer.play(); updateMetrics() })
document.querySelector<HTMLButtonElement>('#pause-button')!.addEventListener('click', () => { wavesurfer.pause(); updateMetrics() })
document.querySelector<HTMLButtonElement>('#seek-button')!.addEventListener('click', () => { wavesurfer.seekTo(0.5); updateMetrics() })
document.querySelector<HTMLButtonElement>('#export-button')!.addEventListener('click', async () => {
  try {
    setStatus('Building report')
    const report = await buildIntegrationReport(observer.snapshot())
    renderReport(output, report)
    downloadReport(report, 'wavesurfer')
    setStatus('Ready', 'ready')
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error')
  }
})

const metricTimer = window.setInterval(updateMetrics, 250)
window.addEventListener('beforeunload', () => {
  window.clearInterval(metricTimer)
  observer.stop()
  wavesurfer.destroy()
})
