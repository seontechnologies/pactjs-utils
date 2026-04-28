import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../sample-app/shared')
    }
  },
  test: {
    environment: 'node',
    include: ['pact/message/consumer/**/*.pacttest.ts'],
    globals: true,
    testTimeout: 30000,
    // See http/vitest.consumer.config.mts for rationale.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } }
  }
})
