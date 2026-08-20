# @audio-browser-lab/mcp

Stdio MCP server with six tools for audio file inspection, browser-report diagnosis and comparison, remote delivery probes, repair plans, and question discovery.

```sh
npx @audio-browser-lab/mcp
```

```json
{
  "mcpServers": {
    "audio-browser-lab": {
      "command": "npx",
      "args": ["-y", "@audio-browser-lab/mcp"]
    }
  }
}
```

The server exposes `inspect_audio_file`, `diagnose_audio_report`, `compare_browser_reports`, `inspect_remote_audio`, `list_audio_questions`, and `generate_repair_plan`.
