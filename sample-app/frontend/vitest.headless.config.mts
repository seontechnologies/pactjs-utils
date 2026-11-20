import baseConfig from './vitest.config.mts'
import type { ViteUserConfigExport } from 'vitest/config'
import { defineConfig } from 'vitest/config'
import merge from 'lodash/merge'

const browserConfig: ViteUserConfigExport = {
  test: {
    browser: {
      instances: [
        {
          browser: 'chromium',
          name: 'chromium-headless'
        }
      ],
      headless: true
    }
  }
}

export default defineConfig(merge({}, baseConfig, browserConfig))
