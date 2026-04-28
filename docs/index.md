---
layout: home

hero:
  name: PactJS Utils
  text: Reusable utilities for Pact.js contract testing
  tagline: Opinionated guardrails for enterprise-scale contract testing.
  actions:
    - theme: brand
      text: Get Started
      link: /installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/seontechnologies/pactjs-utils

features:
  - title: Consumer Helpers
    details: Convert typed objects to Pact-compatible JsonMap params and configure request/response JSON callbacks with createProviderState, toJsonMap, and setJsonContent.
    link: /consumer-helpers/
  - title: Zod to Pact
    details: Derive Pact V3 matchers directly from Zod schemas — no more maintaining two representations of the same response shape. Works with openapi metadata and consumer-curated schemas.
    link: /zod-to-pact/
  - title: Provider Verifier Builders
    details: One-call configuration for HTTP and message-based verification — broker URLs, selectors, state handlers, auth filters, and version tags.
    link: /provider-verifier/
  - title: Request Filter
    details: Inject auth tokens into Pact verification requests with a pluggable token generator. Handles Express middleware types for you.
    link: /request-filter/
  - title: CI Workflow Templates
    details: Ready-to-copy GitHub Actions for consumer publish, provider verify, webhook triggers, BDCT, and local testing — with breaking change detection.
  - title: Three Testing Modes
    details: 'Consumer-driven HTTP, message queue (Kafka/async), and bi-directional (OpenAPI) — all implemented with local and remote flows.'
  - title: Smart Broker Integration
    details: Automatic consumer version selectors, webhook payload routing, breaking change flags, and can-i-deploy gates from environment variables.
---

## Why Not Raw Pact?

Pact.js gives you primitives and lets each team wire them together. That
flexibility becomes a liability at scale: team A configures selectors one way,
team B forgets the breaking-change flag, team C hard-codes broker URLs.

This library enforces a single pattern across every repository:

| Problem with raw Pact                | What goes wrong                                                                                                        | pactjs-utils                                                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Each team wires their own setup      | Style drifts across repos; 30-line boilerplate diverges silently.                                                      | `buildVerifierOptions` / `buildMessageVerifierOptions` — one call, same config shape, every repo.                                                                    |
| DIY consumer version selectors       | Team A verifies `mainBranch`, team B doesn't. Deployments break silently.                                              | `includeMainAndDeployed: true/false` — one boolean, same selectors everywhere.                                                                                       |
| Manual broker URL / webhook handling | Hardcoded URLs break when the broker moves; HTTP suite consumes a Kafka webhook URL (or vice versa).                   | `handlePactBrokerUrlAndSelectors` reads env vars, routes URLs, ignores cross-execution mismatches.                                                                   |
| No breaking-change workflow          | Provider tagged as `dev` while consumer hasn't caught up — broken prod.                                                | When your test maps `PACT_BREAKING_CHANGE` to `includeMainAndDeployed: false`, selectors narrow to `matchingBranch` and `dev` is dropped from provider version tags. |
| Auth injection left to the developer | Double-Bearer prefix (`Bearer Bearer <token>`) — 401 on every run.                                                     | `createRequestFilter` adds `Bearer` exactly once; `tokenGenerator` returns the raw value.                                                                            |
| Manual `JsonMap` casting             | `[object Object]` in provider state params — handler crashes.                                                          | `toJsonMap` converts deterministically; `createProviderState` wraps the pattern.                                                                                     |
| Repetitive builder lambdas           | Every interaction repeats `builder.query(...)` / `builder.jsonBody(...)`.                                              | `setJsonContent` — one curried helper reusable across request and response builders.                                                                                 |
| Duplicate Zod ↔ Pact shapes          | Response schema defined in Zod, then re-defined as `integer()` / `string()` matcher helpers in tests. Drift is silent. | `zodToPactMatchers` — derive matchers from the schema; the example object provides values.                                                                           |

## Quick Start

### Consumer: Creating provider states with typed params

```typescript
// pact/http/consumer/movies-read.pacttest.ts
import {
  createProviderState,
  setJsonContent
} from '@seontechnologies/pactjs-utils'

const state = createProviderState({
  name: 'Has a movie with a specific ID',
  params: { id: 1, name: 'Inception', year: 2010 }
})

await pact
  .addInteraction()
  .given(...state)
  .withRequest(
    'GET',
    '/movies',
    setJsonContent({
      query: { name: 'Inception' }
    })
  )
  .willRespondWith(
    200,
    setJsonContent({
      body: {
        status: 200,
        data: [{ id: 1, name: 'Inception' }]
      }
    })
  )
```

### Provider: Building verifier options with one call

```typescript
// pact/http/provider/provider-contract.pacttest.ts
import { buildVerifierOptions } from '@seontechnologies/pactjs-utils'

const options = buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  stateHandlers,
  includeMainAndDeployed: process.env.PACT_BREAKING_CHANGE !== 'true',
  requestFilter: createRequestFilter({
    tokenGenerator: () => generateAuthToken({ userIdentifier: 'admin' })
  })
})

const verifier = new Verifier(options)
await verifier.verifyProvider()
```

### Auth: Injecting request filters

```typescript
import {
  createRequestFilter,
  noOpRequestFilter
} from '@seontechnologies/pactjs-utils'

// Custom token generator
const filter = createRequestFilter({
  tokenGenerator: () =>
    `${new Date().toISOString()}:${JSON.stringify({ userId: 'admin' })}`
})

// Default (ISO timestamp token)
const defaultFilter = createRequestFilter()
```

### Schema-driven matchers with zodToPactMatchers

```typescript
// pact/http/helpers/consumer-schemas.ts
import { z } from 'zod'

export const ConsumerMovieSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  year: z.number().int(),
  rating: z.number(),
  director: z.string()
})
```

```typescript
// pact/http/consumer/movies-read.pacttest.ts
import { MatchersV3 } from '@pact-foundation/pact'
import {
  setJsonContent,
  zodToPactMatchers
} from '@seontechnologies/pactjs-utils'
import { ConsumerMovieSchema } from '../helpers/consumer-schemas'

const { eachLike } = MatchersV3
const movie = {
  id: 1,
  name: 'My movie',
  year: 1999,
  rating: 8.5,
  director: 'John Doe'
}

await pact
  .addInteraction()
  .given(stateName, stateParams)
  .uponReceiving('a request to get all movies')
  .withRequest('GET', '/movies')
  .willRespondWith(
    200,
    setJsonContent({
      body: {
        status: 200,
        data: eachLike(
          zodToPactMatchers(ConsumerMovieSchema, movie) as Parameters<
            typeof eachLike
          >[0]
        )
      }
    })
  )
// data expands to: eachLike({ id: integer(1), name: string('My movie'), year: integer(1999), rating: decimal(8.5), director: string('John Doe') })
```

### Message/Kafka provider verification

```typescript
// pact/message/provider/provider-message-queue.pacttest.ts
import { buildMessageVerifierOptions } from '@seontechnologies/pactjs-utils'

const options = buildMessageVerifierOptions({
  provider: 'SampleMoviesAPI-event-producer',
  messageProviders,
  stateHandlers,
  includeMainAndDeployed: true
})

const messagePact = new MessageProviderPact(options)
await messagePact.verify()
```

## Utilities

| Category     | Utilities                                                                                                          | Docs                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **Consumer** | `toJsonMap`, `createProviderState`, `setJsonContent`, `setJsonBody`                                                | [Consumer Helpers](/consumer-helpers/)   |
| **Schema**   | `zodToPactMatchers`                                                                                                | [Zod to Pact](/zod-to-pact/)             |
| **Provider** | `buildVerifierOptions`, `buildMessageVerifierOptions`, `handlePactBrokerUrlAndSelectors`, `getProviderVersionTags` | [Provider Verifier](/provider-verifier/) |
| **Auth**     | `createRequestFilter`, `noOpRequestFilter`                                                                         | [Request Filter](/request-filter/)       |

## Pact Testing Types

| Type                                 | Status      | Cost         | Local | Directory        |
| ------------------------------------ | ----------- | ------------ | ----- | ---------------- |
| **Consumer-Driven (HTTP)**           | Implemented | **Free**     | Yes   | `pact/http/`     |
| **Message Queue (Kafka/async)**      | Implemented | **Free**     | Yes   | `pact/message/`  |
| **Bi-Directional (provider-driven)** | Implemented | PactFlow req | No    | `scripts/` (OAS) |

Read more about each type and the testing flows in [Concepts](/concepts).

## CI Workflows

Each workflow is a standalone file that can be copied to its own repo.

| Workflow                             | Repo     | Trigger               | Purpose                                 |
| ------------------------------------ | -------- | --------------------- | --------------------------------------- |
| `contract-test-consumer.yml`         | Consumer | PR + push to main     | Generate pacts, publish, can-i-deploy   |
| `contract-test-provider.yml`         | Provider | PR + push to main     | Verify HTTP pacts, can-i-deploy         |
| `contract-test-provider-message.yml` | Provider | PR + push to main     | Verify message pacts, can-i-deploy      |
| `contract-test-webhook.yml`          | Provider | PactFlow webhook      | Verify when consumer publishes new pact |
| `contract-test-publish-openapi.yml`  | Provider | Push to main + manual | Publish OAS to PactFlow (BDCT)          |
| `contract-test-local.yml`            | Monorepo | PR + manual           | Local consumer + provider (no broker)   |
