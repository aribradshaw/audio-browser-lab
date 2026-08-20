# GitHub issue opportunities

This is an internal contribution tracker for browser-audio issues that Audio Browser Lab may help investigate. It is intentionally separate from the public web lab interface.

## Current candidates

| Project | Issue | Question to answer | Evidence available | Next contribution step |
| --- | --- | --- | --- | --- |
| Howler.js | [#1471](https://github.com/goldfire/howler.js/issues/1471) | Why does Safari cut the end of the final sprite with Web Audio, while the HTML5 backend cuts the beginning? | Public CodePen, CBR MP3 details, expected `ended` timing | Reproduce in Safari and Chrome, capture Howler backend events and both browser clocks, then patch the sprite boundary logic only if the library layer is responsible. |
| WaveSurfer.js | [#4043](https://github.com/katspaugh/wavesurfer.js/issues/4043) | Why does `setTime(10)` move the waveform during `ready`, while iOS playback starts at zero? | Minimal snippet, public WaveSurfer example, matching WebKit reports, and no pinned asset | Test [draft PR #4353](https://github.com/katspaugh/wavesurfer.js/pull/4353) on physical iOS and confirm playback starts at the requested position without breaking the seek bar. |
| Media Extended | [#593](https://github.com/aidenlx/media-extended/issues/593) | Why does repeated seeking to `2:26.52` in a VBR MP3 land inconsistently? | Exact timestamp and format comparison, but the sample file is not attached | Request the sample, inspect its Xing/Info/VBRI table, run repeated native seeks, then determine whether the plugin adds drift beyond Firefox behavior. |

## Contribution activity

- WaveSurfer.js: [draft PR #4353](https://github.com/katspaugh/wavesurfer.js/pull/4353) defers early MediaElement seeks until `canplay`, avoids the unsafe `loadedmetadata` assignment path, cancels stale pending seeks, and adds unit plus browser regression coverage. Local verification passed 39 suites and 579 tests, plus 7 leak tests and focused Edge/Electron playback tests. Physical iOS confirmation is still pending.
- Media Extended: [requested the exact reproduction asset](https://github.com/aidenlx/media-extended/issues/593#issuecomment-5351630722) so native Firefox behavior can be separated from plugin behavior.
- Howler.js: the public CodePen is currently blocked by CodePen's access layer in the automated environment, and the reported failure requires Safari. No fix or public diagnosis should be proposed until that reproduction can be observed.

## Evidence rules

1. Do not claim a project is at fault until the same asset has been tested below the library layer.
2. Record the exact file SHA-256 so cross-browser reports refer to identical bytes.
3. Use repeated seek probes when the issue reports inconsistent results between attempts.
4. Capture the relevant Howler or WaveSurfer adapter when library state is part of the question.
5. Prefer a regression test and focused fix over a workaround recommendation.
6. If the exact asset or affected browser is unavailable, ask for the missing reproduction material instead of guessing.

## Useful Audio Browser Lab command

The browser SDK supports repeated probes for issue work:

```ts
const report = await analyzeBrowserFile(file, {
  seekTargets: [146.52],
  seekRepeats: 5,
})
```
