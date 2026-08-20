import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react'
import { analyzeBrowserFile, getCodecSignals, probeRemoteAudio } from '@audio-browser-lab/browser'
import { compareReports, diagnoseReport, questionCatalog, type AudioBrowserReport, type NetworkEvidence, type ReportComparison } from '@audio-browser-lab/core'

const fmtTime = (value?: number | null) => value == null || !Number.isFinite(value) ? 'N/A' : `${value.toFixed(6)} s`
const fmtBytes = (value?: number | null) => {
  if (value == null) return 'N/A'
  const units = ['B', 'KB', 'MB', 'GB']; let n = value; let unit = 0
  while (n >= 1024 && unit < units.length - 1) { n /= 1024; unit += 1 }
  return `${n.toFixed(unit ? 2 : 0)} ${units[unit]}`
}

function referenceTone() {
  const rate = 44_100, duration = 12, samples = rate * duration
  const buffer = new ArrayBuffer(44 + samples * 2), view = new DataView(buffer)
  const text = (offset: number, value: string) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)))
  text(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true); text(8, 'WAVE'); text(12, 'fmt ')
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, samples * 2, true)
  for (let i = 0; i < samples; i += 1) view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * (220 + Math.floor(i / rate) * 18) * i / rate) * 0x3000, true)
  return new File([buffer], 'abl-reference-tone-12s.wav', { type: 'audio/wav' })
}

function downloadJson(report: AudioBrowserReport) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `abl-${report.file?.name || 'report'}.json`; link.click(); URL.revokeObjectURL(url)
}

function App() {
  const input = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<AudioBrowserReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState('Drop an audio file to begin. It stays on this device.')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [network, setNetwork] = useState<NetworkEvidence | null>(null)
  const [comparison, setComparison] = useState<ReportComparison | null>(null)
  const codecs = useMemo(getCodecSignals, [])

  const run = async (next: File) => {
    setFile(next); setBusy(true); setReport(null); setStatus('Reading file structure, measuring two browser clocks, and probing seeks...')
    try {
      const result = await analyzeBrowserFile(next, { seekTargets: [1, 5, 10], timeoutMs: 12_000 })
      setReport(result); setStatus(`Analysis complete. ${result.findings?.filter((finding) => finding.severity === 'error' || finding.severity === 'warning').length || 0} actionable signal(s) found.`)
    } catch (error) { setStatus(error instanceof Error ? error.message : String(error)) } finally { setBusy(false) }
  }
  const pick = (event: ChangeEvent<HTMLInputElement>) => { const next = event.target.files?.[0]; if (next) void run(next) }
  const drop = (event: DragEvent) => { event.preventDefault(); setDragging(false); const next = event.dataTransfer.files?.[0]; if (next) void run(next) }
  const probe = async () => {
    if (!remoteUrl) return
    setStatus('Checking response headers and a real byte-range request...')
    const result = await probeRemoteAudio(remoteUrl); setNetwork(result)
    const findings = diagnoseReport({ schema: 'audio-browser-lab/report@0.2', generatedAt: new Date().toISOString(), network: result })
    setStatus(findings.find((item) => item.severity === 'error' || item.severity === 'warning')?.summary || 'Remote delivery looks healthy.')
  }
  const compareFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files || [])]; if (files.length !== 2) { setStatus('Select exactly two Audio Browser Lab JSON reports.'); return }
    try { setComparison(compareReports(JSON.parse(await files[0].text()), JSON.parse(await files[1].text()))) } catch { setStatus('One of those files is not a valid report.') }
  }
  const issues = report?.findings?.filter((finding) => finding.severity !== 'pass') || []

  return <main>
    <header className="site-header">
      <a className="brand" href="#top"><span className="pixel-mark">ABL</span><span>Audio Browser Lab</span></a>
      <span className="privacy-chip"><i /> LOCAL ONLY</span>
    </header>

    <section className="hero" id="top">
      <div>
        <p className="kicker">A Flygon LC developer utility</p>
        <h1>STOP GUESSING.<br/><span>MEASURE THE AUDIO.</span></h1>
        <p className="lede">One file. Two browser clocks. Exact MP3 structure. Seek evidence you can compare across Chrome, Firefox, and Safari.</p>
        <div className="hero-actions"><button className="pixel-button primary" onClick={() => input.current?.click()}>ANALYZE A FILE</button><button className="pixel-button" onClick={() => void run(referenceTone())}>RUN DEMO</button></div>
      </div>
      <aside className="mission-card"><span className="tiny-label">CURRENT MISSION</span><strong>{busy ? 'SCANNING...' : report ? 'REPORT READY' : 'AWAITING AUDIO'}</strong><p>{status}</p><div className="scan-line"><span style={{ width: busy ? '65%' : report ? '100%' : '12%' }} /></div></aside>
    </section>

    <section className={`drop-zone ${dragging ? 'dragging' : ''}`} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={(e) => e.preventDefault()} onDrop={drop}>
      <span className="pixel-upload">↑</span><div><span className="tiny-label">01 / INPUT</span><h2>{file?.name || 'DROP AUDIO HERE'}</h2><p>{file ? `${fmtBytes(file.size)} · ${file.type || 'unknown MIME'}` : 'MP3, M4A, WAV, OGG, OPUS, FLAC, OR WEBM'}</p></div><button className="pixel-button dark" onClick={() => input.current?.click()}>CHOOSE FILE</button>
      <input ref={input} className="sr-only" type="file" accept="audio/*,.flac,.opus" onChange={pick}/>
    </section>

    <section className="section-shell">
      <div className="section-title"><div><span className="tiny-label">02 / VERDICT</span><h2>WHAT THE EVIDENCE SAYS</h2></div>{report && <button className="pixel-button" onClick={() => downloadJson(report)}>DOWNLOAD JSON</button>}</div>
      <div className="clock-grid">
        <article className="clock"><span>NATIVE MEDIA</span><strong>{fmtTime(report?.media?.duration)}</strong><small>HTMLMediaElement timeline</small></article>
        <article className="clock"><span>DECODED PCM</span><strong>{fmtTime(report?.webAudio?.duration)}</strong><small>Web Audio timeline</small></article>
        <article className="clock accent"><span>DELTA</span><strong>{fmtTime(report?.media?.duration != null && report?.webAudio?.duration != null ? report.media.duration - report.webAudio.duration : null)}</strong><small>50 ms or more matters</small></article>
      </div>
      <div className="finding-grid">
        {(report?.findings || [{ id: 'waiting', severity: 'info', title: 'Load an asset to generate a verdict', summary: 'The lab will inspect the file and browser independently.', confidence: 'high', questionId: '', evidence: [] }]).map((finding) => <article className={`finding ${finding.severity}`} key={finding.id}><span className="finding-level">{finding.severity}</span><h3>{finding.title}</h3><p>{finding.summary}</p>{finding.recommendation && <div className="fix"><b>FIX</b>{finding.recommendation}</div>}</article>)}
      </div>
    </section>

    <section className="section-shell compact">
      <div className="section-title"><div><span className="tiny-label">03 / FILE FORENSICS</span><h2>WHAT IS INSIDE THE MP3?</h2></div></div>
      <div className="data-board">
        <dl><div><dt>Recognized</dt><dd>{report?.mp3 ? String(report.mp3.recognized) : 'N/A'}</dd></div><div><dt>Bitrate mode</dt><dd>{report?.mp3?.bitrateMode || 'N/A'}</dd></div><div><dt>Seek index</dt><dd>{report?.mp3?.seekTable?.kind || (report?.mp3?.recognized ? 'MISSING' : 'N/A')}</dd></div><div><dt>First frame</dt><dd>{report?.mp3?.firstFrame?.offset ?? 'N/A'}</dd></div><div><dt>ID3v2 bytes</dt><dd>{report?.mp3?.id3v2.totalBytes ?? 'N/A'}</dd></div><div><dt>PCM memory</dt><dd>{fmtBytes(report?.webAudio?.estimatedPcmBytes)}</dd></div></dl>
        <div className="howler-answer"><span className="tiny-label">THE HOWLER QUESTION</span><h3>Why can the same timestamp play different audio?</h3><p>{issues.find((item) => item.questionId === 'howler-cross-browser-seek')?.summary || 'The tool separates Howler from the browser, compares native and decoded clocks, checks the MP3 seek index, and fingerprints decoded audio near requested timestamps. That tells you whether the cause is the asset, browser decoder, player backend, or application offsets.'}</p></div>
      </div>
    </section>

    <section className="dark-section">
      <div className="section-shell compact">
        <div className="section-title"><div><span className="tiny-label lime">04 / QUESTION DECK</span><h2>EIGHT BUGS THIS LAB CAN ANSWER</h2></div></div>
        <div className="question-grid">{questionCatalog.map((question, index) => <details key={question.id}><summary><b>{String(index + 1).padStart(2, '0')}</b>{question.title}</summary><p>{question.shortAnswer}</p><small>NEEDS: {question.evidenceNeeded.join(' · ')}</small></details>)}</div>
      </div>
    </section>

    <section className="section-shell tools">
      <div className="section-title"><div><span className="tiny-label">05 / DELIVERY CHECK</span><h2>PROBE A REMOTE FILE</h2></div></div>
      <div className="url-row"><input aria-label="Remote audio URL" value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="https://example.com/audio.mp3"/><button className="pixel-button dark" onClick={() => void probe()}>CHECK RANGE</button></div>
      {network && <dl className="network-grid"><div><dt>Status</dt><dd>{network.status}</dd></div><div><dt>Content-Type</dt><dd>{network.contentType || 'missing'}</dd></div><div><dt>Accept-Ranges</dt><dd>{network.acceptRanges || 'missing'}</dd></div><div><dt>Range response</dt><dd>{network.rangeRequestStatus || 'failed'}</dd></div></dl>}
      <div className="compare-box"><div><span className="tiny-label">CROSS-BROWSER COMPARE</span><h3>SELECT TWO REPORTS</h3><p>Use the same audio file in two browsers, export both reports, then compare independent timelines.</p></div><label className="pixel-button">CHOOSE 2 JSON FILES<input className="sr-only" type="file" accept="application/json,.json" multiple onChange={compareFiles}/></label>{comparison && <strong className={comparison.compatible ? 'ok' : 'warn'}>{comparison.summary}</strong>}</div>
    </section>

    <section className="surface-strip"><div className="section-shell"><span className="tiny-label">USE IT YOUR WAY</span><div className="surface-grid">{[['WEB LAB','Zero install'],['NPM SDK','Embed analysis'],['HOWLER ADAPTER','Capture backend evidence'],['WAVESURFER ADAPTER','Compare waveform clocks'],['CLI','Inspect in CI'],['HTTP API','Connect any stack'],['MCP SERVER','Give agents the tools']].map(([title, copy]) => <div key={title}><b>{title}</b><span>{copy}</span></div>)}</div></div></section>

    <footer><div className="flygon-lockup"><img src="/flygon-logo.png" alt="Flygon LC"/><span>A FLYGON LC PROJECT</span></div><span>v0.1 · PRIVATE BY DEFAULT · NO ANALYTICS</span></footer>
  </main>
}

export default App
