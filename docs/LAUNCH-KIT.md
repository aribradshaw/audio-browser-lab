# Launch kit

These drafts are deliberately held for review until the npm packages are live and at least one upstream browser-audio fix has been independently confirmed or merged.

## Show HN

**Title**

Show HN: Audio Browser Lab, local-first forensics for cross-browser audio bugs

**Text**

I built Audio Browser Lab after chasing a class of bugs where the same Howler or WaveSurfer timestamp can play different audio in Chrome, Firefox, and Safari.

The hard part is that the player library is only one layer. The compressed asset, its MP3 seek table, native media duration, Web Audio decoding, HTTP range delivery, and the library backend can each expose a different timeline.

The web lab analyzes local files without uploading them. It records MP3 structure, native and decoded durations, repeated seek results, PCM fingerprints, codecs, delivery headers, and optional Howler or WaveSurfer events. Reports can be exported and compared across browsers.

It is also available as seven npm packages, a CLI, a local HTTP API, and an MCP server. No account or hosted backend is required.

Live lab: https://aribradshaw.github.io/audio-browser-lab/

Source: https://github.com/aribradshaw/audio-browser-lab

I would especially value weird reproducible audio files, Safari results, and feedback on which evidence is still missing.

## Reddit or developer community

**Title**

I built a local-first lab for debugging audio that seeks differently across browsers

**Body**

Audio Browser Lab helps separate four things that often get blamed on each other: the audio asset, the browser decoder, HTTP delivery, and the player library.

Drop in an audio file locally and it reports MP3 frame and seek-table structure, native versus decoded duration, repeated seek behavior, PCM fingerprints, codec signals, and optional Howler or WaveSurfer events. Export the JSON in two browsers and compare the same bytes directly.

There is no upload endpoint, account, or tracking. The same engine is available through npm packages, a CLI, API, and MCP server.

I am looking for difficult Safari, Firefox, Howler, and WaveSurfer reproductions more than generic landing-page feedback.

Lab: https://aribradshaw.github.io/audio-browser-lab/

GitHub: https://github.com/aribradshaw/audio-browser-lab

## Short announcement

Browser audio bugs are rarely just player-library bugs. Audio Browser Lab measures the asset, decoder, seek behavior, range delivery, and Howler or WaveSurfer timeline separately, locally, and without uploads.

https://aribradshaw.github.io/audio-browser-lab/
