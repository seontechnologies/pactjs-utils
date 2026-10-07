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
    // Run each pact test file in its own forked subprocess. A single shared
    // fork keeps the @pact-foundation/pact Rust FFI handle alive across
    // files, and a mock server teardown can overlap the next file's startup,
    // which on Linux CI produces "request was expected but not received"
    // flakes (observed 2026-10-07 with singleFork: true). A fork per file
    // lets process exit reap the Rust runtime between files. Files still run
    // sequentially (fileParallelism: false), so the shared pact JSON per
    // consumer+provider pair accumulates by merge across files.
    pool: 'forks',
    poolOptions: { forks: { singleFork: false } }
  }
})
