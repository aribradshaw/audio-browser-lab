#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import {
  REPORT_SCHEMA,
  compareReports,
  diagnoseReport,
  inspectMp3,
  questionCatalog,
  type AudioBrowserReport,
  type DiagnosticFinding,
} from '@audio-browser-lab/core'

export const VERSION = '0.1.0'

const usage = `Audio Browser Lab CLI

Usage:
  abl inspect <audio-file> [--json]
  abl diagnose <report.json> [--json]
  abl compare <left.json> <right.json> [--json]
  abl inspect-url <url> [--json]
  abl questions [--json]

All inspection is local unless inspect-url is used.`

export function repairPlan(findings: DiagnosticFinding[], input = 'input.mp3') {
  const commands: string[] = []
  if (findings.some((finding) => finding.id === 'mp3-vbr-without-index')) {
    commands.push(`ffmpeg -i "${input}" -map_metadata 0 -c:a copy -write_xing 1 "repaired-${basename(input)}"`)
    commands.push(`ffmpeg -i "${input}" -map_metadata 0 -c:a libmp3lame -b:a 192k "canonical-${basename(input)}"`)
  }
  return commands
}

export async function inspectFile(path: string): Promise<AudioBrowserReport> {
  const bytes = await readFile(path)
  const info = await stat(path)
  const mp3 = extname(path).toLowerCase() === '.mp3' || bytes.subarray(0, 3).toString() === 'ID3'
    ? inspectMp3(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength))
    : null
  const report: AudioBrowserReport = {
    schema: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    file: {
      name: basename(path),
      size: info.size,
      modified: info.mtimeMs,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    },
    mp3,
  }
  report.findings = diagnoseReport(report)
  return report
}

async function readReport(path: string) {
  return JSON.parse(await readFile(path, 'utf8')) as AudioBrowserReport
}

export async function inspectUrl(url: string) {
  const headers = { 'User-Agent': 'audio-browser-lab/0.1' }
  let head: Response | undefined
  try { head = await fetch(url, { method: 'HEAD', headers, redirect: 'follow' }) } catch { /* Range still may work. */ }
  const range = await fetch(url, { headers: { ...headers, Range: 'bytes=0-0' }, redirect: 'follow' })
  await range.body?.cancel()
  return {
    url,
    status: head?.status ?? range.status,
    contentType: head?.headers.get('content-type') ?? range.headers.get('content-type'),
    contentLength: Number(head?.headers.get('content-length') || range.headers.get('content-length')) || null,
    acceptRanges: head?.headers.get('accept-ranges') ?? range.headers.get('accept-ranges'),
    contentRange: range.headers.get('content-range'),
    rangeRequestStatus: range.status,
  }
}

const line = (label: string, value: unknown) => `${label.padEnd(22)} ${String(value ?? 'unknown')}`

function renderFindings(findings: DiagnosticFinding[], input = 'input.mp3') {
  return findings.map((finding) => {
    const command = repairPlan([finding], input)
    return `[${finding.severity.toUpperCase()}] ${finding.title}\n  ${finding.summary}${finding.recommendation ? `\n  Fix: ${finding.recommendation}` : ''}${command.length ? `\n  Commands:\n  ${command.join('\n  ')}` : ''}`
  }).join('\n\n')
}

function renderReport(report: AudioBrowserReport) {
  const mp3 = report.mp3
  return [
    'AUDIO BROWSER LAB',
    line('File', report.file?.name),
    line('Bytes', report.file?.size),
    line('SHA-256', report.file?.sha256),
    ...(mp3 ? [
      line('MP3 recognized', mp3.recognized),
      line('Bitrate mode', mp3.bitrateMode),
      line('Seek table', mp3.seekTable?.kind ?? 'missing'),
      line('Estimated duration', mp3.estimatedDuration != null ? `${mp3.estimatedDuration.toFixed(3)} s` : 'unknown'),
      line('Duration confidence', mp3.durationConfidence),
      line('First frame offset', mp3.firstFrame?.offset),
    ] : []),
    '',
    renderFindings(report.findings || [], report.file?.name || 'input.mp3'),
  ].join('\n')
}

export async function runCli(argv = process.argv.slice(2), io = { out: console.log, error: console.error }): Promise<number> {
  const [command, ...args] = argv
  const json = args.includes('--json')
  const values = args.filter((arg) => !arg.startsWith('--'))
  try {
    if (!command || command === 'help' || command === '--help' || command === '-h') { io.out(usage); return 0 }
    if (command === '--version' || command === '-v') { io.out(VERSION); return 0 }
    if (command === 'inspect' && values[0]) {
      const report = await inspectFile(values[0])
      io.out(json ? JSON.stringify(report, null, 2) : renderReport(report)); return 0
    }
    if (command === 'diagnose' && values[0]) {
      const findings = diagnoseReport(await readReport(values[0]))
      io.out(json ? JSON.stringify(findings, null, 2) : renderFindings(findings)); return 0
    }
    if (command === 'compare' && values[0] && values[1]) {
      const result = compareReports(await readReport(values[0]), await readReport(values[1]))
      io.out(json ? JSON.stringify(result, null, 2) : `${result.summary}\n${result.differences.filter((item) => item.meaningful).map((item) => `${item.path}: ${item.left} -> ${item.right}`).join('\n')}`); return result.compatible ? 0 : 2
    }
    if (command === 'inspect-url' && values[0]) {
      const result = await inspectUrl(values[0])
      io.out(json ? JSON.stringify(result, null, 2) : Object.entries(result).map(([key, value]) => line(key, value)).join('\n')); return 0
    }
    if (command === 'questions') {
      io.out(json ? JSON.stringify(questionCatalog, null, 2) : questionCatalog.map((question, index) => `${index + 1}. ${question.title}\n   ${question.shortAnswer}`).join('\n\n')); return 0
    }
    io.error(`Invalid command or missing argument.\n\n${usage}`); return 1
  } catch (error) {
    io.error(error instanceof Error ? error.message : String(error)); return 1
  }
}

const isEntry = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
if (isEntry) process.exitCode = await runCli()
