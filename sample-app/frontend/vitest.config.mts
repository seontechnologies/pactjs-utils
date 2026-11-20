import { defineConfig, mergeConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { msw } from 'msw/vite'
import viteConfig from './vite.config.mts'

const viteConfigBase = viteConfig({
  mode: process.env.NODE_ENV || 'test',
  command: 'serve'
})

const config = mergeConfig(
  viteConfigBase,
  defineConfig({
    // msw 3 serves its worker script through this plugin
    plugins: [msw({ mode: 'worker-only' })],
    test: {
      retry: 3,
      browser: {
        enabled: true,
        provider: playwright(),
        instances: [
          {
            browser: 'chromium',
            name: 'chromium'
          }
        ]
      },
      environment: 'happy-dom',
      setupFiles: ['./src/test-utils/vitest-utils/vitest.setup.ts'],
      include: ['src/**/*.vitest.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules/**', 'src/consumer.test.ts']
    }
  })
)

export default config
