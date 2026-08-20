# Contributing

Bug reports are strongest when they include the exact audio format, affected browsers, player backend, exported Audio Browser Lab reports, and a redistributable minimal fixture.

## Start with evidence

1. Reproduce the same asset below the player-library layer when possible.
2. Record the exact browser, operating system, device, backend, library version, and file SHA-256.
3. Export reports from each affected browser or attach equivalent CLI output.
4. For remote media, include range-request and response-header evidence.
5. State whether the fixture can legally be redistributed.

Use the structured [browser-audio bug form](https://github.com/aribradshaw/audio-browser-lab/issues/new/choose). Reports missing the original asset may still be useful, but they cannot prove whether a compressed timeline or seek-table difference caused the failure.

## Pull requests

Keep fixes focused. Parser and diagnosis changes need deterministic tests. Browser timing changes need a minimal fixture and affected-browser evidence. Upstream-library fixes should distinguish native behavior from Howler or WaveSurfer behavior before assigning fault.

Before opening a pull request, run:

```sh
npm install
npm run check
npm test
npm run build
npm run pack:check
```

Add a deterministic test for parser or diagnosis changes. Do not commit copyrighted audio without clear redistribution permission.
