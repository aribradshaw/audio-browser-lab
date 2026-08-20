import { REPORT_SCHEMA, type AudioBrowserReport, type DiagnosticEvidence, type DiagnosticFinding } from './types'

const seconds = (value: number) => `${value.toFixed(6)} s`
const megabytes = (value: number) => `${(value / 1024 / 1024).toFixed(1)} MiB`
const evidence = (label: string, value: DiagnosticEvidence['value'], source: DiagnosticEvidence['source']): DiagnosticEvidence => ({ label, value, source })

export function diagnoseReport(report: AudioBrowserReport): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = []
  const mp3 = report.mp3
  const mediaDuration = report.media?.duration
  const decodedDuration = report.webAudio?.duration

  if (mp3?.recognized && mp3.bitrateMode === 'VBR' && !mp3.seekTable) findings.push({
    id: 'mp3-vbr-without-index',
    questionId: 'howler-cross-browser-seek',
    severity: 'error',
    confidence: 'high',
    title: 'Variable-bitrate MP3 has no seek table',
    summary: 'Browsers must estimate byte positions without a Xing, Info, or VBRI index. Long-file seeking and duration can diverge between decoders.',
    evidence: [
      evidence('Bitrate mode', mp3.bitrateMode, 'mp3'),
      evidence('Sampled bitrates', (mp3.sampledBitratesKbps || []).join(', '), 'mp3'),
      evidence('Seek table', 'missing', 'mp3'),
    ],
    recommendation: 'Remux a copy with a valid Xing table. If remuxing does not normalize playback, encode a canonical CBR or indexed VBR asset and retest.',
  })

  if (mp3?.id3v2.present && (mp3.id3v2.totalBytes || 0) > 64 * 1024) findings.push({
    id: 'mp3-large-leading-tag',
    questionId: 'audio-sprite-drift',
    severity: mp3.seekTable ? 'info' : 'warning',
    confidence: 'high',
    title: 'Large metadata block precedes the audio stream',
    summary: 'Correct decoders skip ID3v2, but a large leading block increases the cost of byte-based duration or seek estimates when an index is absent.',
    evidence: [evidence('ID3v2 bytes', mp3.id3v2.totalBytes || 0, 'mp3'), evidence('First frame offset', mp3.firstFrame?.offset || 0, 'mp3')],
    recommendation: 'Preserve the metadata fields but remove unnecessary padding or embedded artwork from a test copy, then rebuild the seek table.',
  })

  if (mediaDuration != null && decodedDuration != null) {
    const delta = mediaDuration - decodedDuration
    const disagrees = Math.abs(delta) > 0.05
    findings.push({
      id: 'duration-source-disagreement',
      questionId: 'duration-differs-by-browser',
      severity: disagrees ? 'error' : 'pass',
      confidence: 'high',
      title: disagrees ? 'Browser duration clocks disagree' : 'Browser duration clocks agree',
      summary: disagrees
        ? 'The HTML media timeline and fully decoded PCM timeline differ enough to affect timestamps, regions, chapters, or audio sprites.'
        : 'The HTML media timeline and fully decoded PCM timeline agree within 50 milliseconds.',
      evidence: [evidence('HTML media', seconds(mediaDuration), 'media-element'), evidence('Web Audio', seconds(decodedDuration), 'web-audio'), evidence('Delta', seconds(delta), 'comparison')],
      recommendation: disagrees ? 'Compare this same file in another browser and inspect its container or MP3 seek metadata before changing application offsets.' : undefined,
    })
  }

  if (mp3?.estimatedDuration != null && mediaDuration != null) {
    const delta = mediaDuration - mp3.estimatedDuration
    if (Math.abs(delta) > 0.05) findings.push({
      id: 'mp3-browser-duration-disagreement',
      questionId: 'duration-differs-by-browser',
      severity: 'warning',
      confidence: mp3.durationConfidence || 'low',
      title: 'Browser duration differs from the MP3 structure',
      summary: 'The browser clock does not match the duration derived from the file index or sampled bitrate.',
      evidence: [evidence('Browser duration', seconds(mediaDuration), 'media-element'), evidence('MP3 duration', seconds(mp3.estimatedDuration), 'mp3'), evidence('Delta', seconds(delta), 'comparison')],
      recommendation: 'Treat a high-confidence Xing or VBRI duration as strong evidence. A low-confidence bitrate estimate is only a clue.',
    })
  }

  for (const seek of report.seeks || []) if (Math.abs(seek.delta) > 0.01) findings.push({
    id: 'seek-report-delta',
    questionId: 'audio-sprite-drift',
    severity: Math.abs(seek.delta) > 0.05 ? 'error' : 'warning',
    confidence: 'high',
    title: 'The media element did not report the requested seek time',
    summary: 'The browser clamped or adjusted the requested currentTime.',
    evidence: [evidence('Requested', seconds(seek.requested), 'media-element'), evidence('Reported', seconds(seek.reported), 'media-element'), evidence('Delta', seconds(seek.delta), 'comparison')],
    recommendation: 'Check seekable ranges and server byte-range behavior. For audible alignment, compare fingerprints around the same target in each browser.',
  })

  if (report.webAudio?.error) findings.push({
    id: 'webaudio-decode-failure', questionId: 'safari-decode-failure', severity: 'error', confidence: 'high', title: 'Web Audio could not decode the asset', summary: report.webAudio.error,
    evidence: [evidence('Decode error', report.webAudio.error, 'web-audio')],
    recommendation: 'Test a canonical asset in the same codec, verify the actual container and codec profile, and compare with HTML media playback.',
  })

  if (report.media?.error) findings.push({
    id: 'media-load-failure', questionId: 'safari-decode-failure', severity: 'error', confidence: 'high', title: 'The browser media element could not load the asset', summary: report.media.error,
    evidence: [evidence('Media error', report.media.error, 'media-element')],
    recommendation: 'Verify the file container, response Content-Type, CORS headers, and byte-range support.',
  })

  const claimedCodecs = (report.codecs || []).filter((codec) => codec.result !== 'no')
  if (claimedCodecs.length && (report.webAudio?.error || report.media?.error)) findings.push({
    id: 'codec-claim-but-decode-failed', questionId: 'codec-claim-vs-reality', severity: 'warning', confidence: 'medium', title: 'Codec support claim did not predict this file',
    summary: 'canPlayType describes a format family. The real asset still failed a media or Web Audio decode path.',
    evidence: [evidence('Positive codec claims', claimedCodecs.map((codec) => `${codec.label}:${codec.result}`).join(', '), 'media-element')],
    recommendation: 'Trust the real file test. Verify the container, codec profile, MIME type, and network response before changing player code.',
  })

  if (report.file?.type && report.codecs?.some((codec) => codec.mime.split(';')[0] === report.file?.type && codec.result === 'no')) findings.push({
    id: 'codec-unsupported', questionId: 'safari-decode-failure', severity: 'warning', confidence: 'medium', title: 'The browser does not claim support for this file type',
    summary: `The loaded file reports ${report.file.type}, and the matching canPlayType signal is no.`,
    evidence: [evidence('File MIME type', report.file.type, 'file')],
    recommendation: 'Provide a broadly supported fallback format and test the actual file in the target browser.',
  })

  const pcmBytes = report.webAudio?.estimatedPcmBytes
    ?? (decodedDuration && report.webAudio?.sampleRate && report.webAudio.channels ? decodedDuration * report.webAudio.sampleRate * report.webAudio.channels * 4 : undefined)
  if (pcmBytes && pcmBytes > 250 * 1024 * 1024) findings.push({
    id: 'webaudio-large-allocation', questionId: 'long-audio-memory', severity: pcmBytes > 1024 * 1024 * 1024 ? 'error' : 'warning', confidence: 'high', title: 'Full Web Audio decode requires a large PCM allocation',
    summary: 'Compressed file size is not the memory cost. Web Audio expands the complete asset into floating-point PCM.',
    evidence: [evidence('Estimated PCM', megabytes(pcmBytes), 'web-audio')],
    recommendation: 'Use an HTML media backend, peaks generated offline, or chunked streaming for long-form audio.',
  })

  if (report.network) {
    if (report.network.contentType && !report.network.contentType.toLowerCase().startsWith('audio/')) findings.push({
      id: 'network-content-type', questionId: 'remote-seek-slow-or-broken', severity: 'warning', confidence: 'high', title: 'Remote response is not labeled as audio',
      summary: `The server returned ${report.network.contentType}. Incorrect media types can change sniffing, caching, or playback behavior.`,
      evidence: [evidence('Content-Type', report.network.contentType, 'network')],
      recommendation: 'Configure the origin or CDN to return the correct audio Content-Type for this asset.',
    })
    if (report.network.acceptRanges?.toLowerCase() !== 'bytes') findings.push({
      id: 'network-no-byte-ranges', questionId: 'remote-seek-slow-or-broken', severity: 'warning', confidence: report.network.corsReadable === false ? 'low' : 'high', title: 'Byte-range support was not confirmed',
      summary: 'Long-form media seeking may require downloading from the start when the server does not advertise byte ranges.',
      evidence: [evidence('Accept-Ranges', report.network.acceptRanges || 'missing', 'network')],
      recommendation: 'Serve static audio with Accept-Ranges: bytes and verify that a Range request receives HTTP 206 with Content-Range.',
    })
    if (report.network.rangeRequestStatus && report.network.rangeRequestStatus !== 206) findings.push({
      id: 'network-range-request-failed', questionId: 'remote-seek-slow-or-broken', severity: 'error', confidence: 'high', title: 'The server did not honor a byte-range request',
      summary: `The probe expected HTTP 206 but received ${report.network.rangeRequestStatus}.`,
      evidence: [evidence('Range status', report.network.rangeRequestStatus, 'network')],
      recommendation: 'Fix CDN or origin range handling before debugging the player library.',
    })
  }

  const integration = report.integration
  if (integration?.library === 'howler' && integration.duration != null && mediaDuration != null) {
    const delta = integration.duration - mediaDuration
    if (Math.abs(delta) > 0.05) findings.push({
      id: 'howler-duration-disagreement', questionId: 'howler-cross-browser-seek', severity: 'error', confidence: 'high', title: 'Howler and the native media element disagree',
      summary: 'The library-reported duration differs from the browser media clock.',
      evidence: [evidence('Howler duration', seconds(integration.duration), 'integration'), evidence('Media duration', seconds(mediaDuration), 'media-element'), evidence('Backend', integration.backend || 'unknown', 'integration')],
      recommendation: 'Confirm whether Howler is using Web Audio or HTML5 mode, then compare its duration to the corresponding native clock.',
    })
  }

  if (integration?.library === 'wavesurfer' && integration.duration != null && mediaDuration != null) {
    const delta = integration.duration - mediaDuration
    if (Math.abs(delta) > 0.05) findings.push({
      id: 'wavesurfer-duration-disagreement', questionId: 'waveform-player-length-mismatch', severity: 'error', confidence: 'high', title: 'wavesurfer and the media element use different timelines',
      summary: 'Regions, ticks, or waveform positions can drift because the waveform duration differs from the player duration.',
      evidence: [evidence('wavesurfer duration', seconds(integration.duration), 'integration'), evidence('Media duration', seconds(mediaDuration), 'media-element'), evidence('Delta', seconds(delta), 'comparison')],
      recommendation: 'Use precomputed peaks with an explicit duration or normalize the media asset so decoded and media clocks agree.',
    })
  }

  if (!findings.length) findings.push({
    id: 'insufficient-evidence', questionId: 'duration-differs-by-browser', severity: 'info', confidence: 'high', title: 'More measurements are needed',
    summary: 'Load an asset, wait for metadata, and run a Web Audio decode to compare independent browser clocks.', evidence: [],
  })
  return findings
}

export function withDiagnostics(report: Omit<AudioBrowserReport, 'schema' | 'findings'> & { schema?: AudioBrowserReport['schema'] }): AudioBrowserReport {
  const normalized = { ...report, schema: REPORT_SCHEMA } as AudioBrowserReport
  return { ...normalized, findings: diagnoseReport(normalized) }
}
