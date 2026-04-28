import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globalSetup: ['./scripts/global-setup.ts'],
    setupFiles: ['./scripts/setup-after-env.ts'],
    testTimeout: 10000
  }
})
