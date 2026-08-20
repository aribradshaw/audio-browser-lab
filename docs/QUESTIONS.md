# Diagnostic question catalog

Audio Browser Lab is organized around questions and the minimum evidence needed to answer them.

1. **Why does the same Howler timestamp play different audio across browsers?** Compare the MP3 index, native clock, decoded clock, Howler backend, and seek probes.
2. **Why does duration differ across browsers?** Compare media duration, decoded PCM duration, and indexed file duration.
3. **Why is a waveform longer or shorter than the player?** Compare WaveSurfer, media-element, and decoded timelines.
4. **Why do audio sprites or game cues drift?** Inspect frame indexing, encoder boundaries, and requested-versus-reported seeks.
5. **Why does Safari or Web Audio fail to decode a playable-looking asset?** Separate a codec claim from a real file decode.
6. **Why is remote seeking slow or broken?** Verify media headers and an actual HTTP Range response.
7. **Why does a long file freeze or crash under Web Audio?** Estimate expanded float PCM memory, not compressed file size.
8. **Why does `canPlayType` say probably when playback fails?** Verify the exact container, codec profile, file structure, MIME response, and decode path.

Every exported finding includes a stable ID, severity, confidence, evidence, and a repair recommendation so applications can render or automate the result.
