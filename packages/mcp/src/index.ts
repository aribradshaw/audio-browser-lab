#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { McpServer } from '@modelcontextprotocol/server'
import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { z } from 'zod'
import { inspectFile, inspectUrl, repairPlan } from '@audio-browser-lab/cli/library'
import { compareReports, diagnoseReport, questionCatalog, type AudioBrowserReport } from '@audio-browser-lab/core'

const jsonText = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }], structuredContent: value as Record<string, unknown> })
const readReport = async (path: string) => JSON.parse(await readFile(path, 'utf8')) as AudioBrowserReport

export function createAudioBrowserLabMcpServer() {
  const server = new McpServer({ name: 'audio-browser-lab', version: '0.1.0' })

  server.registerTool('inspect_audio_file', {
    description: 'Inspect a local audio file without uploading it. Returns MP3 structure, a SHA-256 identity, evidence-backed findings, and repair advice.',
    inputSchema: z.object({ path: z.string().describe('Absolute or working-directory-relative file path') }),
  }, async ({ path }) => jsonText(await inspectFile(path)))

  server.registerTool('diagnose_audio_report', {
    description: 'Run the diagnosis engine against an Audio Browser Lab JSON report.',
    inputSchema: z.object({ reportPath: z.string() }),
  }, async ({ reportPath }) => jsonText({ findings: diagnoseReport(await readReport(reportPath)) }))

  server.registerTool('compare_browser_reports', {
    description: 'Compare two reports for the exact same audio asset and surface meaningful browser timeline differences.',
    inputSchema: z.object({ leftPath: z.string(), rightPath: z.string() }),
  }, async ({ leftPath, rightPath }) => jsonText(compareReports(await readReport(leftPath), await readReport(rightPath))))

  server.registerTool('inspect_remote_audio', {
    description: 'Probe a remote audio URL for content metadata and working HTTP byte-range support.',
    inputSchema: z.object({ url: z.url() }),
  }, async ({ url }) => jsonText(await inspectUrl(url)))

  server.registerTool('list_audio_questions', {
    description: 'List the browser-audio debugging questions Audio Browser Lab can answer and the evidence needed for each.',
    inputSchema: z.object({}),
  }, async () => jsonText({ questions: questionCatalog }))

  server.registerTool('generate_repair_plan', {
    description: 'Generate conservative ffmpeg commands from a report. Commands create new files and do not overwrite the source.',
    inputSchema: z.object({ reportPath: z.string(), inputPath: z.string().optional() }),
  }, async ({ reportPath, inputPath }) => {
    const report = await readReport(reportPath)
    const findings = diagnoseReport(report)
    return jsonText({ findings, commands: repairPlan(findings, inputPath || report.file?.name || 'input.mp3') })
  })

  return server
}

const isEntry = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href
if (isEntry) serveStdio(() => createAudioBrowserLabMcpServer())
