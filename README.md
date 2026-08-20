# Audio Browser Lab

A local-first browser audio compatibility and diagnostics workbench.

Audio Browser Lab helps developers investigate cases where the same audio file reports a different duration, seeks differently, or behaves differently across Chrome, Firefox, Safari, and other browsers. Files are analyzed entirely inside the browser and are never uploaded.

## Current capabilities

- Load a local audio file or a generated reference tone
- Record HTMLMediaElement duration, seekable ranges, and buffered ranges
- Decode the complete asset with Web Audio and compare the decoded duration
- Run an exact seek probe and record the browser-reported landing point
- Inspect `canPlayType` signals for common web audio formats
- Capture the browser environment and relevant media events
- Copy or download a portable JSON report for comparison across browsers

Web Audio may resample decoded PCM to the `AudioContext` sample rate. The lab reports that resulting rate and frame count while comparing duration in seconds, which remains the useful cross-browser timeline measurement.

## Why it exists

Browser audio bugs are often reported as “the timestamp is wrong” or “Safari behaves differently.” The hard part is identifying which layer disagrees:

1. The compressed file and its metadata
2. The browser's media demuxer
3. Web Audio decoding
4. A playback library such as Howler or wavesurfer.js
5. The application itself

This lab exposes the browser-level evidence before someone starts adding fragile offsets or library-specific workarounds.

## Local development

```sh
npm install
npm run dev
```

Then open `http://127.0.0.1:4173`.

## Production build

```sh
npm run check
npm run build
npm run preview
```

## Privacy

Audio Browser Lab has no backend, uploads, accounts, or analytics. A selected file is represented by a temporary local object URL in the current browser tab.

## Roadmap

- Side-by-side report comparison
- MP3 frame, ID3, Xing, Info, and VBRI inspection
- Waveform and audible seek-marker verification
- Media Source Extensions and HTTP Range diagnostics
- Shareable test fixtures and regression cases
- Automated browser test matrix

## License

MIT
