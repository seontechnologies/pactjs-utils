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
    include: ['pact/http/provider/**/*.pacttest.ts'],
    globals: true,
    testTimeout: 60000,
    hookTimeout: 30000,
    // Provider verification spins up a real server via start-server-and-test
    // and walks every interaction sequentially. Parallel files fight for the
    // port and tear down each other's provider states.
    fileParallelism: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    env: {
      DISABLE_KAFKA: 'true'
    }
  }
})
