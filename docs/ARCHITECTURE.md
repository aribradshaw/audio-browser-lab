# Architecture

The project is a small monorepo with one shared report schema.

```text
audio file or URL
  -> core MP3 inspector and report schema
  -> browser measurements or Node inspection
  -> deterministic diagnosis engine
  -> web UI, CLI, API, MCP, Howler adapter, or WaveSurfer adapter
```

`@audio-browser-lab/core` has no browser or Node dependency. It owns structure inspection, questions, diagnoses, and report comparison. The browser package adds native media, Web Audio, codec, seek, hashing, and remote-delivery measurements. Every other surface consumes the same core functions so the verdict does not drift between interfaces.

The report SHA-256 protects cross-browser comparisons from the most common testing mistake: using different files with the same display name.
