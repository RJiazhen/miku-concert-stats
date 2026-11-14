import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [vue() as never],
  resolve: {
    alias: {
      '~': path.join(root, 'app'),
      '~~': root,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
