import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { cli: 'src/cli.ts' },
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  clean: true,
  splitting: false,
  sourcemap: false,
  banner: { js: '#!/usr/bin/env node' },
  external: ['ink', 'react', 'chokidar', 'yaml', 'smol-toml', 'string-width'],
})
