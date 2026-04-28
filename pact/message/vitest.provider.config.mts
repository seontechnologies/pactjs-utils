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
    include: ['pact/message/provider/**/*.pacttest.ts'],
    globals: true,
    testTimeout: 60000,
    hookTimeout: 30000,
    // See http/vitest.provider.config.mts for rationale.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    env: {
      DISABLE_KAFKA: 'true'
    }
  }
})
