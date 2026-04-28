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
    include: ['pact/http/consumer/**/*.pacttest.ts'],
    globals: true,
    testTimeout: 30000,
    // PactV4 merges every interaction into one JSON file per consumer+provider
    // pair. Parallel test files race on that shared file and produce a
    // non-deterministic artifact. Keep this off for every pact suite.
    fileParallelism: false,
    // Run every pact test file inside a single forked subprocess. Threads
    // pool (vitest default) shares the @pact-foundation/pact Rust FFI
    // handle across files in the same consumer+provider pair, which on
    // Linux CI produces "request was expected but not received" flakes
    // when a mock server teardown overlaps the next file's startup.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } }
  }
})
