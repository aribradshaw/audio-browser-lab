# Integration guide

## Browser application

Call `analyzeBrowserFile(file)` from a user action. Full Web Audio decoding expands the entire file into memory, so offer an opt-out for long-form audio.

## Howler

Create the observer immediately after the `Howl`. Include `Howler.usingWebAudio` as the backend and merge `observer.snapshot()` into the browser report's `integration` field before running `diagnoseReport`.

## WaveSurfer

Create `observeWaveSurfer(instance)` after initialization. Its snapshot records duration, position, scroll, width, and lifecycle events. Comparing that duration to the browser report identifies a waveform-versus-player timeline mismatch.

## CLI and CI

Use `abl inspect fixture.mp3 --json` to archive file-level evidence. Use browser reports for actual decoder behavior. A CI check can reject a new MP3 when finding `mp3-vbr-without-index` is present.

## HTTP API

The API binds only when your application calls `.listen()`. Set a narrow `corsOrigin`, keep it on a trusted interface, and lower `maxBodyBytes` for public deployments.

## MCP

The MCP server uses stdio and writes protocol messages only to stdout. It can inspect local files, compare reports, probe remote assets, explain supported questions, and create non-destructive repair commands. File access is governed by the MCP host's process permissions.
