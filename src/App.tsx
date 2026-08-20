import { ChangeEvent, DragEvent, useRef, useState } from 'react'
import { analyzeBrowserFile, probeRemoteAudio } from '@audio-browser-lab/browser'
import { compareReports, diagnoseReport, questionCatalog, type AudioBrowserReport, type NetworkEvidence, type ReportComparison } from '@audio-browser-lab/core'
import { PageFrame } from './SiteChrome'

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
  const [error, setError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState('COPY SUMMARY')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [network, setNetwork] = useState<NetworkEvidence | null>(null)
  const [comparison, setComparison] = useState<ReportComparison | null>(null)
  const [openQuestionIds, setOpenQuestionIds] = useState<string[]>([])
  const run = async (next: File) => {
    setFile(next); setBusy(true); setError(null); setReport(null); setCopyStatus('COPY SUMMARY'); setStatus('Reading file structure, measuring two browser clocks, and probing seeks...')
    try {
      const result = await analyzeBrowserFile(next, { seekTargets: [1, 5, 10], timeoutMs: 12_000 })
      setReport(result); setStatus(`Analysis complete. ${result.findings?.filter((finding) => finding.severity === 'error' || finding.severity === 'warning').length || 0} actionable signal(s) found.`)
    } catch (caught) { const message = caught instanceof Error ? caught.message : String(caught); setError(message); setStatus(message) } finally { setBusy(false) }
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
  const copySummary = async () => {
    if (!report) return
    const summary = [
      `Audio Browser Lab report: ${file?.name || 'audio file'}`,
      `Native media: ${fmtTime(report.media?.duration)}`,
      `Decoded PCM: ${fmtTime(report.webAudio?.duration)}`,
      `Delta: ${fmtTime(report.media?.duration != null && report.webAudio?.duration != null ? report.media.duration - report.webAudio.duration : null)}`,
      `Verdict: ${issues.length} actionable signal${issues.length === 1 ? '' : 's'} found`,
      issues[0]?.summary || 'No warnings found in the current evidence.',
    ].join('\n')
    try { await navigator.clipboard.writeText(summary); setCopyStatus('COPIED'); window.setTimeout(() => setCopyStatus('COPY SUMMARY'), 1600) } catch { setStatus('Copy is unavailable here. Use Download JSON instead.'); setCopyStatus('COPY UNAVAILABLE') }
  }
  const toggleQuestion = (id: string) => setOpenQuestionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const issues = report?.findings?.filter((finding) => finding.severity !== 'pass') || []
  const formatLabel = file ? (file.type.split('/')[1]?.toUpperCase() || file.name.split('.').pop()?.toUpperCase() || 'AUDIO') : null
  const isMp3 = Boolean(report?.mp3?.recognized)

  return <PageFrame>
    <main id="main-content" className="home-page">
    <section className="workspace-shell" id="top">
      <div className="workspace-intro">
        <div>
          <p className="kicker">A Flygon LC developer utility</p>
          <h1>MEASURE THE AUDIO.<br/><span>SEE THE EVIDENCE.</span></h1>
          <p className="workspace-lede">Drop a file or run the demo. The lab measures browser clocks, decodes the audio, and gives you a result you can act on.</p>
        </div>
        <div className="workspace-proof" aria-label="Lab capabilities"><span>0 files uploaded</span><span>2 independent clocks</span><span>8 questions answered</span></div>
      </div>
      <div className="workspace-grid">
        <section className={`workspace-input ${dragging ? 'dragging' : ''}`} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={(e) => e.preventDefault()} onDrop={drop} aria-labelledby="input-title">
          <div className="workspace-panel-heading"><div><span className="tiny-label">01 / INPUT</span><h2 id="input-title">{file?.name || 'DROP AUDIO HERE'}</h2><p>{file ? `${fmtBytes(file.size)} - ${file.type || 'unknown MIME'}` : 'MP3, M4A, WAV, OGG, OPUS, FLAC, OR WEBM'}</p></div><span className="workspace-state">{file ? 'LOADED' : 'LOCAL ONLY'}</span></div>
          <div className="workspace-drop-target"><span className="pixel-upload" aria-hidden="true">&#8593;</span><span>{dragging ? 'Release to analyze' : 'Drop a file here or choose one below'}</span></div>
          <div className="workspace-actions"><button className="pixel-button primary" onClick={() => input.current?.click()}>ANALYZE A FILE</button><button className="pixel-button" onClick={() => void run(referenceTone())}>RUN DEMO</button></div>
          <aside className="mission-card"><span className="tiny-label">CURRENT MISSION</span><strong>{busy ? 'SCANNING...' : report ? 'REPORT READY' : 'AWAITING AUDIO'}</strong><p>{status}</p><div className="scan-line"><span style={{ width: busy ? '65%' : report ? '100%' : '12%' }} /></div></aside>
          <input ref={input} className="sr-only" type="file" accept="audio/*,.flac,.opus" onChange={pick}/>
        </section>
        <section className="workspace-results" aria-labelledby="verdict-title">
          <div className="workspace-panel-heading"><div><span className="tiny-label">02 / VERDICT</span><h2 id="verdict-title">EVIDENCE AT A GLANCE</h2></div>{report && <span className="workspace-state">REPORT READY</span>}</div>
          <div className="clock-grid workspace-clock-grid">
            <article className="clock"><span>NATIVE MEDIA</span><strong>{fmtTime(report?.media?.duration)}</strong><small>HTMLMediaElement timeline</small></article>
            <article className="clock"><span>DECODED PCM</span><strong>{fmtTime(report?.webAudio?.duration)}</strong><small>Web Audio timeline</small></article>
            <article className="clock accent"><span>DELTA</span><strong>{fmtTime(report?.media?.duration != null && report?.webAudio?.duration != null ? report.media.duration - report.webAudio.duration : null)}</strong><small>50 ms or more matters</small></article>
          </div>
          <div className={`workspace-verdict ${report ? 'ready' : ''}`} aria-live="polite">
            <span className="finding-level">{report ? 'VERDICT READY' : 'WAITING FOR AUDIO'}</span>
            <strong>{busy ? 'Reading the file...' : report ? `${issues.length} actionable signal${issues.length === 1 ? '' : 's'} found` : 'Your result will appear here'}</strong>
            <p>{report ? (issues[0]?.summary || 'No warnings found in the current evidence.') : 'Run the demo or analyze a local file to compare independent browser timelines.'}</p>
          </div>
          {error && <div className="workspace-error" role="alert"><span className="finding-level">ANALYSIS FAILED</span><strong>We could not finish this file.</strong><p>{error}</p><div className="workspace-error-actions"><button className="pixel-button" onClick={() => file && void run(file)}>TRY AGAIN</button><span>Try another file if the error continues.</span></div></div>}
          {report && <div className="workspace-next-actions" aria-label="Next steps"><button className="pixel-button primary" onClick={() => downloadJson(report)}>DOWNLOAD JSON</button><button className="pixel-button" onClick={() => void copySummary()}>{copyStatus}</button><a className="pixel-button" href="#delivery-check">COMPARE REPORTS</a><a className="text-button" href="#questions">SEE DIAGNOSTIC QUESTIONS ↓</a></div>}
        </section>
      </div>
    </section>
    <section className="evidence-flow" aria-labelledby="evidence-flow-title">
      <div className="section-shell compact"><div className="section-title"><div><span className="tiny-label">HOW IT WORKS</span><h2 id="evidence-flow-title">FOLLOW THE EVIDENCE</h2></div></div><div className="evidence-flow-grid"><article><b>01</b><strong>File</strong><span>Inspect the exact asset.</span></article><article><b>02</b><strong>Clocks</strong><span>Measure native and decoded time.</span></article><article><b>03</b><strong>Evidence</strong><span>Probe seeks, memory, and delivery.</span></article><article><b>04</b><strong>Action</strong><span>Get a diagnosis you can test.</span></article></div></div>
    </section>
    <section className="section-shell compact">
      <div className="section-title"><div><span className="tiny-label">03 / FILE FORENSICS</span><h2>WHAT IS INSIDE THE FILE?</h2></div></div>
      <div className="data-board">
        <dl><div><dt>Format</dt><dd>{formatLabel || 'N/A'}</dd></div><div><dt>MP3 structure</dt><dd>{report ? (isMp3 ? 'Recognized' : 'Not applicable') : 'N/A'}</dd></div><div><dt>Bitrate mode</dt><dd>{isMp3 ? report?.mp3?.bitrateMode || 'Unknown' : 'Not applicable'}</dd></div><div><dt>Seek index</dt><dd>{isMp3 ? report?.mp3?.seekTable?.kind || 'MISSING' : 'Browser measured'}</dd></div><div><dt>First frame</dt><dd>{isMp3 ? report?.mp3?.firstFrame?.offset ?? 'N/A' : 'Not applicable'}</dd></div><div><dt>PCM memory</dt><dd>{fmtBytes(report?.webAudio?.estimatedPcmBytes)}</dd></div></dl>
        <div className="howler-answer"><span className="tiny-label">{isMp3 ? 'MP3 SEEK CONTEXT' : 'WHAT THIS RESULT MEANS'}</span><h3>{isMp3 ? 'Why can the same timestamp play different audio?' : file ? `What the ${formatLabel || 'audio'} result tells you` : 'Load an asset to see file evidence'}</h3><p>{isMp3 ? (issues.find((item) => item.questionId === 'howler-cross-browser-seek')?.summary || 'The tool separates Howler from the browser, compares native and decoded clocks, checks the MP3 seek index, and fingerprints decoded audio near requested timestamps. That tells you whether the cause is the asset, browser decoder, player backend, or application offsets.') : file ? 'This format does not expose the MP3 frame fields above. The useful evidence is the browser decode result, independent clocks, seek behavior, and estimated PCM memory.' : 'The lab will adapt this panel to the file format after you analyze an asset.'}</p></div>
      </div>
      <div className="finding-grid detailed-findings">
        {(report?.findings || [{ id: 'waiting', severity: 'info', title: 'Load an asset to generate a verdict', summary: 'The lab will inspect the file and browser independently.', confidence: 'high', questionId: '', evidence: [] }]).map((finding) => <article className={`finding ${finding.severity}`} key={finding.id}><span className="finding-level">{finding.severity}</span><h3>{finding.title}</h3><p>{finding.summary}</p>{finding.recommendation && <div className="fix"><b>FIX</b>{finding.recommendation}</div>}</article>)}
      </div>
    </section>

    <section className="dark-section" id="questions">
      <div className="section-shell compact">
        <div className="section-title"><div><span className="tiny-label lime">04 / QUESTION DECK</span><h2>EIGHT BUGS THIS LAB CAN ANSWER</h2></div></div>
        <div className="question-grid">{questionCatalog.map((question, index) => {
          const isOpen = openQuestionIds.includes(question.id)
          const answerId = `question-answer-${question.id}`
          return <article className={`question-card ${isOpen ? 'open' : ''}`} key={question.id}>
            <button type="button" aria-expanded={isOpen} aria-controls={answerId} onClick={() => toggleQuestion(question.id)}>
              <b>{String(index + 1).padStart(2, '0')}</b><span>{question.title}</span><i aria-hidden="true">{isOpen ? '−' : '+'}</i>
            </button>
            <div className="question-answer" id={answerId} aria-hidden={!isOpen}>
              <div className="question-answer-inner"><p>{question.shortAnswer}</p><small>NEEDS: {question.evidenceNeeded.join(' · ')}</small></div>
            </div>
          </article>
        })}</div>
      </div>
    </section>

    <section className="section-shell tools" id="delivery-check">
      <div className="section-title"><div><span className="tiny-label">05 / DELIVERY CHECK</span><h2>PROBE A REMOTE FILE</h2></div></div>
      <div className="url-row"><input aria-label="Remote audio URL" value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="https://example.com/audio.mp3"/><button className="pixel-button dark" onClick={() => void probe()}>CHECK RANGE</button></div>
      {network && <dl className="network-grid"><div><dt>Status</dt><dd>{network.status}</dd></div><div><dt>Content-Type</dt><dd>{network.contentType || 'missing'}</dd></div><div><dt>Accept-Ranges</dt><dd>{network.acceptRanges || 'missing'}</dd></div><div><dt>Range response</dt><dd>{network.rangeRequestStatus || 'failed'}</dd></div></dl>}
      <div className="compare-box"><div><span className="tiny-label">CROSS-BROWSER COMPARE</span><h3>SELECT TWO REPORTS</h3><p>Use the same audio file in two browsers, export both reports, then compare independent timelines.</p></div><label className="pixel-button">CHOOSE 2 JSON FILES<input className="sr-only" type="file" accept="application/json,.json" multiple onChange={compareFiles}/></label>{comparison && <strong className={comparison.compatible ? 'ok' : 'warn'}>{comparison.summary}</strong>}</div>
    </section>

    <section className="surface-strip"><div className="section-shell"><span className="tiny-label">USE IT YOUR WAY</span><div className="surface-grid">{[['WEB LAB','Zero install'],['NPM SDK','Embed analysis'],['HOWLER ADAPTER','Capture backend evidence'],['WAVESURFER ADAPTER','Compare waveform clocks'],['CLI','Inspect in CI'],['HTTP API','Connect any stack'],['MCP SERVER','Give agents the tools']].map(([title, copy]) => <div key={title}><b>{title}</b><span>{copy}</span></div>)}</div></div></section>

    </main>
  </PageFrame>
}

export default App
