import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// GitHub Pages requires /repo-name/ base path.
// Override with DOCS_BASE for local development and previews.
const base = process.env.DOCS_BASE || '/pactjs-utils/'

export default withMermaid(
  defineConfig({
    title: 'PactJS Utils',
    description: 'A collection of utilities for Pact.js contract testing',
    base,
    lastUpdated: true,
    vite: {
      optimizeDeps: {
        include: ['mermaid']
      }
    },
    themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      {
        text: 'Guide',
        items: [
          { text: 'Concepts', link: '/concepts' },
          { text: 'Installation', link: '/installation' },
          { text: 'Migration from Raw Pact', link: '/migration' }
        ]
      },
      {
        text: 'API',
        items: [
          { text: 'Consumer Helpers', link: '/consumer-helpers/' },
          { text: 'Zod to Pact', link: '/zod-to-pact/' },
          { text: 'Request Filter', link: '/request-filter/' },
          { text: 'Provider Verifier', link: '/provider-verifier/' }
        ]
      },
      {
        text: 'GitHub',
        link: 'https://github.com/seontechnologies/pactjs-utils'
      }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation', link: '/installation' },
          { text: 'Concepts', link: '/concepts' },
          { text: 'Migration from Raw Pact', link: '/migration' }
        ]
      },
      {
        text: 'Consumer Helpers',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/consumer-helpers/' },
          { text: 'toJsonMap', link: '/consumer-helpers/to-json-map' },
          { text: 'createProviderState', link: '/consumer-helpers/create-provider-state' },
          { text: 'setJsonContent', link: '/consumer-helpers/set-json-content' },
          { text: 'setJsonBody', link: '/consumer-helpers/set-json-body' }
        ]
      },
      {
        text: 'Zod to Pact',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/zod-to-pact/' },
          { text: 'zodToPactMatchers', link: '/zod-to-pact/zod-to-pact-matchers' }
        ]
      },
      {
        text: 'Request Filter',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/request-filter/' },
          { text: 'createRequestFilter', link: '/request-filter/create-request-filter' },
          { text: 'noOpRequestFilter', link: '/request-filter/no-op-request-filter' }
        ]
      },
      {
        text: 'Provider Verifier',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/provider-verifier/' },
          { text: 'buildVerifierOptions', link: '/provider-verifier/build-verifier-options' },
          { text: 'buildMessageVerifierOptions', link: '/provider-verifier/build-message-verifier-options' },
          { text: 'handlePactBrokerUrlAndSelectors', link: '/provider-verifier/handle-pact-broker-url-and-selectors' },
          { text: 'getProviderVersionTags', link: '/provider-verifier/get-provider-version-tags' }
        ]
      }
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/seontechnologies/pactjs-utils'
      }
    ],
    search: {
      provider: 'local'
    },
    editLink: {
      pattern:
        'https://github.com/seontechnologies/pactjs-utils/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright © 2024-present SEON Technologies Kft.'
    }
  }
})
)
