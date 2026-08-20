import { afterEach, describe, expect, it } from 'vitest'
import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import { createAudioBrowserLabMcpServer } from '../src'

const close: Array<() => Promise<void>> = []
afterEach(async () => { for (const item of close.splice(0).reverse()) await item() })

describe('MCP server', () => {
  it('negotiates MCP, lists six tools, and calls the question tool', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    const server = createAudioBrowserLabMcpServer()
    const client = new Client({ name: 'abl-test', version: '1.0.0' })
    close.push(() => client.close(), () => server.close())
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
    const tools = await client.listTools()
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      'compare_browser_reports', 'diagnose_audio_report', 'generate_repair_plan',
      'inspect_audio_file', 'inspect_remote_audio', 'list_audio_questions',
    ])
    const result = await client.callTool({ name: 'list_audio_questions', arguments: {} })
    expect(JSON.stringify(result)).toContain('howler-cross-browser-seek')
  })
})
