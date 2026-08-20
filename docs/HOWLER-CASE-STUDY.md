# Howler cross-browser timestamp case study

## Symptom

An application calls `howl.seek(120)` but the audible moment differs between Chrome, Firefox, and Safari. Adding a browser-specific offset may appear to fix one file and break another.

## The causal chain

Howler chooses either Web Audio or HTML5 audio. Those backends do not invent an audio timeline. They inherit one from browser decoding and media demuxing. For MP3, an indexed stream gives the decoder a frame count and byte map. A variable-bitrate stream without Xing, Info, or VBRI metadata forces estimation. Different decoder and backend paths can then disagree about duration or the compressed byte corresponding to a timestamp.

The useful question is not "what offset does Safari need?" It is "which layer first reports a different timeline for this exact file?"

## Evidence order

1. Hash the file so every test uses the same bytes.
2. Inspect MPEG frames, bitrate variation, ID3 size, and seek-table metadata.
3. Compare native media duration with fully decoded PCM duration.
4. Record Howler's selected backend and duration.
5. Seek to identical targets and compare requested time, reported time, completion time, and decoded fingerprint.
6. Repeat with the exported report in every target browser.

## Interpreting results

- VBR plus no seek table is strong asset-level evidence. Remux an indexed copy first.
- Native and decoded clocks disagree while Howler matches one of them. The backend explains the Howler result.
- All browser clocks agree but Howler differs. Investigate library configuration, sprites, and application state.
- Local seeks work but remote seeks fail. Inspect `Accept-Ranges`, HTTP 206, `Content-Range`, CORS, and `Content-Type`.
- Reports differ but SHA-256 hashes do not match. The comparison is invalid because the browsers tested different bytes.

## Conservative repair

Create a new file. Keep the original as evidence.

```sh
ffmpeg -i input.mp3 -map_metadata 0 -c:a copy -write_xing 1 repaired-input.mp3
```

If stream-copy remuxing does not normalize the result, create a canonical CBR test asset:

```sh
ffmpeg -i input.mp3 -map_metadata 0 -c:a libmp3lame -b:a 192k canonical-input.mp3
```

Retest both files. A change in behavior is causal evidence. It is stronger than a player offset that only hides the symptom.
