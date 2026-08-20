import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from 'react'

type DecodeResult = {
  duration: number
  sampleRate: number
  channels: number
  frames: number
  decodeMs: number
}

type SeekResult = {
  requested: number
  reported: number
  delta: number
  completedMs: number
}

type MediaSnapshot = {
  duration: number | null
  readyState: number
  networkState: number
  seekable: Array<[number, number]>
  buffered: Array<[number, number]>
}

type LogEntry = {
  at: string
  event: string
  detail?: string
}

type NavigatorWithMemory = Navigator & { deviceMemory?: number }

const codecTests = [
  ['MP3', 'audio/mpeg'],
  ['AAC / M4A', 'audio/mp4; codecs="mp4a.40.2"'],
  ['WAV PCM', 'audio/wav; codecs="1"'],
  ['Ogg Vorbis', 'audio/ogg; codecs="vorbis"'],
  ['Opus / WebM', 'audio/webm; codecs="opus"'],
  ['FLAC', 'audio/flac'],
] as const

const formatSeconds = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return 'Unavailable'
  return `${value.toFixed(6)} s`
}

const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`
}

const rangesToArray = (ranges: TimeRanges): Array<[number, number]> =>
  Array.from({ length: ranges.length }, (_, index) => [ranges.start(index), ranges.end(index)])

function createTestTone(): File {
  const sampleRate = 44_100
  const duration = 12
  const samples = sampleRate * duration
  const buffer = new ArrayBuffer(44 + samples * 2)
  const view = new DataView(buffer)
  const write = (offset: number, value: string) =>
    [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)))

  write(0, 'RIFF')
  view.setUint32(4, 36 + samples * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples * 2, true)

  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate
    const secondPulse = time % 1 < 0.045 ? Math.sin(2 * Math.PI * 1320 * time) * 0.35 : 0
    const tone = Math.sin(2 * Math.PI * 220 * time) * 0.16
    view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, tone + secondPulse)) * 0x7fff, true)
  }

  return new File([buffer], 'abl-reference-tone-12s.wav', { type: 'audio/wav' })
}

function App() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [sourceUrl, setSourceUrl] = useState('')
  const [media, setMedia] = useState<MediaSnapshot | null>(null)
  const [decoded, setDecoded] = useState<DecodeResult | null>(null)
  const [seekTarget, setSeekTarget] = useState(5)
  const [seekResult, setSeekResult] = useState<SeekResult | null>(null)
  const [isDecoding, setIsDecoding] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('Choose an audio file or use the reference tone.')
  const [logs, setLogs] = useState<LogEntry[]>([])

  const codecSupport = useMemo(() => {
    const audio = document.createElement('audio')
    return codecTests.map(([label, mime]) => ({ label, mime, result: audio.canPlayType(mime) || 'no' }))
  }, [])

  const browser = useMemo(() => {
    const nav = navigator as NavigatorWithMemory
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform || 'Unavailable',
      language: navigator.language,
      cores: navigator.hardwareConcurrency || null,
      memoryGb: nav.deviceMemory || null,
      crossOriginIsolated: window.crossOriginIsolated,
      audioContext: Boolean(window.AudioContext),
      mediaCapabilities: 'mediaCapabilities' in navigator,
    }
  }, [])

  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
  }, [])

  const addLog = (event: string, detail?: string) => {
    setLogs((current) => [{ at: new Date().toISOString(), event, detail }, ...current].slice(0, 30))
  }

  const snapshotMedia = () => {
    const audio = audioRef.current
    if (!audio) return null
    const next = {
      duration: Number.isFinite(audio.duration) ? audio.duration : null,
      readyState: audio.readyState,
      networkState: audio.networkState,
      seekable: rangesToArray(audio.seekable),
      buffered: rangesToArray(audio.buffered),
    }
    setMedia(next)
    return next
  }

  const loadFile = (nextFile: File) => {
    if (!nextFile.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|opus|flac|webm)$/i.test(nextFile.name)) {
      setMessage('That file does not look like a supported audio asset.')
      return
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = URL.createObjectURL(nextFile)
    setFile(nextFile)
    setSourceUrl(objectUrlRef.current)
    setMedia(null)
    setDecoded(null)
    setSeekResult(null)
    setLogs([])
    setMessage('File loaded locally. Start with the metadata result, then run the decoder comparison.')
    addLog('file-selected', `${nextFile.name}, ${formatBytes(nextFile.size)}`)
  }

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (nextFile) loadFile(nextFile)
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const nextFile = event.dataTransfer.files?.[0]
    if (nextFile) loadFile(nextFile)
  }

  const decodeFile = async () => {
    if (!file) return
    setIsDecoding(true)
    setMessage('Decoding the complete file with Web Audio. Large files may take a moment.')
    const started = performance.now()
    const context = new AudioContext()
    try {
      const buffer = await context.decodeAudioData(await file.arrayBuffer())
      const result = {
        duration: buffer.duration,
        sampleRate: buffer.sampleRate,
        channels: buffer.numberOfChannels,
        frames: buffer.length,
        decodeMs: performance.now() - started,
      }
      setDecoded(result)
      addLog('decode-complete', `${formatSeconds(result.duration)}, ${result.sampleRate} Hz`)
      setMessage('Decode complete. Compare the two duration values and run a seek probe.')
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      addLog('decode-error', detail)
      setMessage(`Web Audio could not decode this file: ${detail}`)
    } finally {
      await context.close()
      setIsDecoding(false)
    }
  }

  const runSeekProbe = async () => {
    const audio = audioRef.current
    if (!audio || !media?.duration) return
    const requested = Math.max(0, Math.min(seekTarget, media.duration - 0.001))
    setIsSeeking(true)
    const started = performance.now()
    try {
      const seeked = new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Seek timed out after 5 seconds.')), 5000)
        audio.addEventListener('seeked', () => {
          window.clearTimeout(timeout)
          resolve()
        }, { once: true })
      })
      audio.currentTime = requested
      await seeked
      const reported = audio.currentTime
      const result = {
        requested,
        reported,
        delta: reported - requested,
        completedMs: performance.now() - started,
      }
      setSeekResult(result)
      addLog('seek-probe', `${formatSeconds(requested)} requested, ${formatSeconds(reported)} reported`)
      snapshotMedia()
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      addLog('seek-error', detail)
      setMessage(detail)
    } finally {
      setIsSeeking(false)
    }
  }

  const report = useMemo(() => ({
    schema: 'audio-browser-lab/report@0.1',
    generatedAt: new Date().toISOString(),
    browser,
    file: file ? { name: file.name, type: file.type, size: file.size, modified: file.lastModified } : null,
    codecSupport,
    htmlMediaElement: media,
    webAudioDecode: decoded,
    durationDifferenceSeconds: media?.duration != null && decoded ? media.duration - decoded.duration : null,
    seekProbe: seekResult,
    events: [...logs].reverse(),
  }), [browser, codecSupport, decoded, file, logs, media, seekResult])

  const copyReport = async () => {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2))
    setMessage('Diagnostic report copied to the clipboard.')
  }

  const downloadReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `audio-browser-report-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    setMessage('Diagnostic report downloaded.')
  }

  const durationDifference = media?.duration != null && decoded ? media.duration - decoded.duration : null

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Audio Browser Lab home">
          <span className="brand-mark" aria-hidden="true">ABL</span>
          <span>Audio Browser Lab</span>
        </a>
        <span className="privacy-chip"><span aria-hidden="true">●</span> Local-only analysis</span>
      </header>

      <section className="hero" id="top">
        <div>
          <p className="eyebrow">Browser audio diagnostics</p>
          <h1>Same timestamp.<br />Different browser?</h1>
          <p className="hero-copy">
            Inspect what the browser reports, what Web Audio decodes, and what happens when it seeks. Your file never leaves this device.
          </p>
        </div>
        <div className="status-card" aria-live="polite">
          <span className="status-label">Lab status</span>
          <strong>{file ? 'Asset ready' : 'Waiting for an asset'}</strong>
          <p>{message}</p>
        </div>
      </section>

      <section className="workspace" aria-label="Audio test workspace">
        <div
          className={`drop-zone ${dragging ? 'is-dragging' : ''}`}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          <div className="drop-icon" aria-hidden="true">↥</div>
          <div>
            <p className="step-label">01 / LOAD</p>
            <h2>Choose an audio file</h2>
            <p>MP3, M4A, WAV, OGG, Opus, FLAC, or WebM. Nothing is uploaded.</p>
          </div>
          <div className="button-row">
            <button className="button primary" onClick={() => inputRef.current?.click()}>Choose file</button>
            <button className="button secondary" onClick={() => loadFile(createTestTone())}>Use test tone</button>
          </div>
          <input ref={inputRef} className="visually-hidden" type="file" accept="audio/*,.flac,.opus" onChange={onFileInput} />
        </div>

        {sourceUrl && (
          <div className="player-panel">
            <div className="file-summary">
              <span className="file-type">{file?.name.split('.').pop()?.toUpperCase() || 'AUDIO'}</span>
              <div>
                <strong>{file?.name}</strong>
                <span>{file ? `${formatBytes(file.size)} · ${file.type || 'unknown MIME type'}` : ''}</span>
              </div>
            </div>
            <audio
              ref={audioRef}
              controls
              preload="metadata"
              src={sourceUrl}
              onLoadedMetadata={() => {
                const next = snapshotMedia()
                if (next?.duration) setSeekTarget(Math.min(5, next.duration / 2))
                addLog('loadedmetadata', `duration ${formatSeconds(next?.duration)}`)
              }}
              onDurationChange={() => { snapshotMedia(); addLog('durationchange') }}
              onCanPlay={() => { snapshotMedia(); addLog('canplay') }}
              onError={() => { snapshotMedia(); addLog('media-error', audioRef.current?.error?.message) }}
            />
          </div>
        )}
      </section>

      <section className="results" aria-label="Test results">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Measurements</p>
            <h2>Two clocks, one file</h2>
          </div>
          <button className="button secondary" disabled={!file || isDecoding} onClick={decodeFile}>
            {isDecoding ? 'Decoding…' : decoded ? 'Decode again' : 'Run Web Audio decode'}
          </button>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <span className="metric-index">A</span>
            <p>HTML media duration</p>
            <strong>{formatSeconds(media?.duration)}</strong>
            <small>The timeline reported by the audio element.</small>
          </article>
          <article className="metric-card">
            <span className="metric-index">B</span>
            <p>Decoded duration</p>
            <strong>{formatSeconds(decoded?.duration)}</strong>
            <small>{decoded ? `${decoded.frames.toLocaleString()} frames at the context's ${decoded.sampleRate.toLocaleString()} Hz rate` : 'Decode the complete file to measure PCM audio.'}</small>
          </article>
          <article className={`metric-card ${durationDifference && Math.abs(durationDifference) > 0.05 ? 'attention' : ''}`}>
            <span className="metric-index">Δ</span>
            <p>Difference</p>
            <strong>{formatSeconds(durationDifference)}</strong>
            <small>{durationDifference == null ? 'Available after both clocks are measured.' : Math.abs(durationDifference) <= 0.05 ? 'The two browser timelines closely agree.' : 'Worth comparing in another browser.'}</small>
          </article>
        </div>

        <div className="lab-grid">
          <article className="panel">
            <div className="panel-heading">
              <div><p className="step-label">02 / SEEK</p><h3>Seek probe</h3></div>
              <span className="tag">HTMLMediaElement</span>
            </div>
            <p className="panel-copy">Ask the browser to jump to an exact second, then record where it says it landed and how long the seek took.</p>
            <label className="field-label" htmlFor="seek-target">Target time in seconds</label>
            <div className="field-row">
              <input id="seek-target" type="number" min="0" step="0.001" value={seekTarget} onChange={(event) => setSeekTarget(event.target.valueAsNumber || 0)} />
              <button className="button primary" disabled={!media?.duration || isSeeking} onClick={runSeekProbe}>{isSeeking ? 'Seeking…' : 'Run probe'}</button>
            </div>
            <dl className="data-list">
              <div><dt>Requested</dt><dd>{formatSeconds(seekResult?.requested)}</dd></div>
              <div><dt>Reported</dt><dd>{formatSeconds(seekResult?.reported)}</dd></div>
              <div><dt>Delta</dt><dd>{formatSeconds(seekResult?.delta)}</dd></div>
              <div><dt>Completed in</dt><dd>{seekResult ? `${seekResult.completedMs.toFixed(1)} ms` : 'Unavailable'}</dd></div>
            </dl>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div><p className="step-label">03 / SUPPORT</p><h3>Codec signals</h3></div>
              <span className="tag">canPlayType</span>
            </div>
            <p className="panel-copy">These are browser promises, not proof. “Probably” is encouraging; a real file test is stronger.</p>
            <div className="codec-list">
              {codecSupport.map((codec) => (
                <div key={codec.mime}>
                  <span><strong>{codec.label}</strong><small>{codec.mime}</small></span>
                  <span className={`support ${codec.result}`}>{codec.result}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="environment">
        <div className="section-heading compact">
          <div><p className="eyebrow">Environment</p><h2>What ran the test</h2></div>
        </div>
        <div className="environment-grid">
          <dl className="data-list wide">
            <div><dt>Platform</dt><dd>{browser.platform}</dd></div>
            <div><dt>Language</dt><dd>{browser.language}</dd></div>
            <div><dt>CPU threads</dt><dd>{browser.cores ?? 'Unavailable'}</dd></div>
            <div><dt>Device memory</dt><dd>{browser.memoryGb ? `${browser.memoryGb} GB` : 'Unavailable'}</dd></div>
          </dl>
          <div className="ua-block"><span>User agent</span><code>{browser.userAgent}</code></div>
        </div>
      </section>

      <section className="report-panel">
        <div>
          <p className="eyebrow">Portable evidence</p>
          <h2>Run it again somewhere else.</h2>
          <p>Open this lab in Chrome, Firefox, and Safari with the same file. Export each report and compare the numbers instead of guessing.</p>
        </div>
        <div className="button-row">
          <button className="button light" onClick={copyReport}>Copy report</button>
          <button className="button outline-light" onClick={downloadReport}>Download JSON</button>
        </div>
      </section>

      <footer>
        <span>Audio Browser Lab · v0.1</span>
        <span>Local-first. No uploads. No analytics.</span>
      </footer>
    </main>
  )
}

export default App
