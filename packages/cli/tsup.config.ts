import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/library.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  noExternal: [/.*/],
})
