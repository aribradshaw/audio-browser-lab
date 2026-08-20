# Synthetic fixtures

These short MP3s were generated from a mathematical sine wave with FFmpeg and are safe to redistribute.

- `vbr-no-xing.mp3` is variable bitrate with no Xing index. It must trigger `mp3-vbr-without-index`.
- `vbr-indexed.mp3` is the same generated signal with a Xing index. It supplies a high-confidence frame-count duration.

Regenerate them with:

```sh
ffmpeg -f lavfi -i "aevalsrc=sin(2*PI*440*t)*(0.2+0.8*t/8):s=44100:d=8" -c:a libmp3lame -q:a 2 -write_xing 0 -y test-fixtures/vbr-no-xing.mp3
ffmpeg -f lavfi -i "aevalsrc=sin(2*PI*440*t)*(0.2+0.8*t/8):s=44100:d=8" -c:a libmp3lame -q:a 2 -write_xing 1 -y test-fixtures/vbr-indexed.mp3
```
