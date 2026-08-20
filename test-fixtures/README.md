# Redistributable browser-audio fixtures

These short files are generated from mathematical signals and dedicated to the public domain under CC0 1.0. They provide stable bytes for reproducing browser-audio duration, seeking, metadata, and decoder behavior.

| Fixture | Bug class | Expected behavior |
| --- | --- | --- |
| [`vbr-no-xing.mp3`](vbr-no-xing.mp3) | VBR duration and seek drift | Triggers the high-confidence `mp3-vbr-without-index` finding. |
| [`vbr-indexed.mp3`](vbr-indexed.mp3) | Duration and seek-index reference | Reports VBR with a Xing table and high-confidence duration. |

[`manifest.json`](manifest.json) is the machine-readable source of truth for provenance, license, SHA-256, byte size, format metadata, expected behavior, and bug class. [`LICENSE.md`](LICENSE.md) records the CC0 dedication.

Published builds expose the same bytes at `https://aribradshaw.github.io/audio-browser-lab/test-fixtures/<file>`.

Regenerate them with:

```sh
ffmpeg -f lavfi -i "aevalsrc=sin(2*PI*440*t)*(0.2+0.8*t/8):s=44100:d=8" -c:a libmp3lame -q:a 2 -write_xing 0 -y test-fixtures/vbr-no-xing.mp3
ffmpeg -f lavfi -i "aevalsrc=sin(2*PI*440*t)*(0.2+0.8*t/8):s=44100:d=8" -c:a libmp3lame -q:a 2 -write_xing 1 -y test-fixtures/vbr-indexed.mp3
```

After regeneration, update the matching manifest digest and byte count. `npm test` fails if the files and manifest drift.
