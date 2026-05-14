---
title: Provider Verifier
description: Build verifier options for HTTP and message-based Pact provider verification with built-in support for consumer version selectors, breaking changes, and webhook payloads.
---

# Provider Verifier

The provider verifier module reduces Pact provider test setup from dozens of
lines of boilerplate to a single function call. It builds `VerifierOptions`
(HTTP) or `PactMessageProviderOptions` (message/Kafka) objects with
production-ready defaults for CI metadata, broker configuration, consumer
version selectors, and webhook handling.

## Features

- Single-call setup for HTTP provider verification via [`buildVerifierOptions`](./build-verifier-options)
- Single-call setup for message/Kafka provider verification via [`buildMessageVerifierOptions`](./build-message-verifier-options)
- Automatic consumer version selector construction with `matchingBranch`, `mainBranch`, and `deployedOrReleased`
- Built-in breaking change workflow via `PACT_BREAKING_CHANGE` env var
- Webhook payload URL parsing with provider/consumer matching and fallback
- CI-aware provider version tagging via [`getProviderVersionTags`](./get-provider-version-tags)
- Mutates options in place via [`handlePactBrokerUrlAndSelectors`](./handle-pact-broker-url-and-selectors) for advanced control

## The Problem

Provider verification in Pact requires configuring:

- Broker URL, token, and publish flags
- Provider version metadata (SHA, branch, tags)
- Consumer version selectors that control which pacts to verify
- State handlers and request filters
- Webhook payload URL handling for CI-triggered verification
- Breaking change flags that alter selector and tag behavior

In a typical project with multiple provider-consumer pairs, each provider test
file repeats this setup. Small differences between files (a missing selector, a
wrong default, an unhandled webhook URL) cause subtle verification failures
that are difficult to debug. When breaking changes require coordinated
deployment, the boilerplate becomes even more error-prone because selectors,
tags, and pending pact flags must all change together.

This module encapsulates those decisions into two builder functions and a small
set of environment variables, making provider tests declarative and consistent
across an entire organization.

---

## Public API

| Export                                                                      | Kind     | Description                                                         |
| --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| [`buildVerifierOptions`](./build-verifier-options)                          | function | Builds `VerifierOptions` for HTTP provider verification.            |
| [`buildMessageVerifierOptions`](./build-message-verifier-options)           | function | Builds `PactMessageProviderOptions` for message-based verification. |
| [`handlePactBrokerUrlAndSelectors`](./handle-pact-broker-url-and-selectors) | function | Mutates options with broker URL or webhook payload URL logic.       |
| [`getProviderVersionTags`](./get-provider-version-tags)                     | function | Generates CI-aware provider version tags.                           |

---

## Environment Variables

| Variable               | Purpose                                                               | Required                                 | Default     |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------- | ----------- |
| `PACT_BROKER_BASE_URL` | Base URL of the Pact Broker (e.g., `https://your-org.pactflow.io`)    | Yes (unless `PACT_PAYLOAD_URL` matches)  | --          |
| `PACT_BROKER_TOKEN`    | Authentication token for the Pact Broker                              | Yes (for remote flow)                    | --          |
| `GITHUB_SHA`           | Commit SHA used as `providerVersion`                                  | No (set automatically by GitHub Actions) | `'unknown'` |
| `GITHUB_BRANCH`        | Branch name used as `providerVersionBranch` and in version tags       | No (set automatically by GitHub Actions) | `'main'`    |
| `PACT_BREAKING_CHANGE` | Set to `'true'` to exclude the `'dev'` tag even on `master`/`main`. The `'dev'` tag is only added on the deployable branch in the first place — see [`getProviderVersionTags`](./get-provider-version-tags). | No                                       | `'false'`   |
| `PACT_PAYLOAD_URL`     | Webhook-provided URL pointing to a specific pact for verification     | No (set by PactFlow webhooks)            | --          |

See the `.env.example` file in the repository root for a template.

---

## Real-World Examples

### Minimal HTTP Verification

The simplest setup for a provider that verifies all consumers.

```typescript
// Full example: https://github.com/seontechnologies/pactjs-utils/blob/main/pact/http/provider/provider-contract.pacttest.ts
import { buildVerifierOptions } from '@seontechnologies/pactjs-utils'
import { Verifier } from '@pact-foundation/pact'

const options = buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  includeMainAndDeployed: true
})

const verifier = new Verifier(options)
await verifier.verifyProvider()
```

### Full HTTP Verification with Auth, State Handlers, and Breaking Change Support

A production-grade setup with custom request filtering, state handlers, and
dynamic breaking change detection.

```typescript
import {
  buildVerifierOptions,
  createRequestFilter
} from '@seontechnologies/pactjs-utils'
import { Verifier } from '@pact-foundation/pact'

const includeMainAndDeployed = process.env.PACT_BREAKING_CHANGE !== 'true'

const options = buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  logLevel: 'debug',
  includeMainAndDeployed,
  consumer: 'SampleAppConsumer',
  enablePending: process.env.PACT_BREAKING_CHANGE === 'true',
  requestFilter: createRequestFilter({
    tokenGenerator: () => 'test-auth-token'
  }),
  stateHandlers: {
    'An existing movie exists': {
      setup: async () => {
        // Seed the database with a movie
        await db.movies.create({ id: 1, name: 'Test Movie' })
        return { id: 1 }
      },
      teardown: async () => {
        await db.movies.deleteAll()
      }
    },
    'No movies exist': async () => {
      await db.movies.deleteAll()
    }
  }
})

const verifier = new Verifier(options)
await verifier.verifyProvider()
```

### Message / Kafka Verification

A message-based provider that produces events consumed via Kafka or similar.

```typescript
import { buildMessageVerifierOptions } from '@seontechnologies/pactjs-utils'
import { MessageProviderPact } from '@pact-foundation/pact'

const options = buildMessageVerifierOptions({
  provider: 'SampleMoviesAPI-event-producer',
  consumer: 'SampleAppConsumer-event-consumer',
  includeMainAndDeployed: true,
  messageProviders: {
    'a movie created event': async () => ({
      id: 1,
      name: 'New Movie',
      year: 2024,
      event: 'CREATED'
    }),
    'a movie deleted event': async () => ({
      id: 1,
      event: 'DELETED'
    })
  },
  stateHandlers: {
    'a movie with id 1 exists': async () => {
      // Prepare state for the message provider
    }
  }
})

const messagePact = new MessageProviderPact(options)
await messagePact.verify()
```

### Webhook-Triggered Verification with Payload URL

When PactFlow triggers a webhook, the CI workflow receives `PACT_PAYLOAD_URL`.
The builder automatically detects and validates it.

```typescript
import { buildVerifierOptions } from '@seontechnologies/pactjs-utils'
import { Verifier } from '@pact-foundation/pact'

// PACT_PAYLOAD_URL is set by the webhook, e.g.:
// https://broker.pactflow.io/pacts/provider/SampleMoviesAPI/consumer/SampleAppConsumer/latest

const options = buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  includeMainAndDeployed: true,
  consumer: 'SampleAppConsumer'
  // pactPayloadUrl defaults to process.env.PACT_PAYLOAD_URL
  // pactBrokerUrl defaults to process.env.PACT_BROKER_BASE_URL
})

// If PACT_PAYLOAD_URL matches SampleMoviesAPI + SampleAppConsumer:
//   options.pactUrls = ['https://broker.pactflow.io/pacts/provider/SampleMoviesAPI/consumer/SampleAppConsumer/latest']
//   options.pactBrokerUrl = undefined
//   options.consumerVersionSelectors = undefined
//
// If PACT_PAYLOAD_URL does NOT match (e.g., different provider):
//   options.pactBrokerUrl = process.env.PACT_BROKER_BASE_URL
//   options.consumerVersionSelectors = [{ consumer: 'SampleAppConsumer', matchingBranch: true }, ...]

const verifier = new Verifier(options)
await verifier.verifyProvider()
```

This pattern is critical when the same CI job runs multiple provider
verification suites (HTTP and message). Each suite declares its own `provider`
and `consumer`, and only the suite whose names match the webhook URL uses the
payload directly. The other suites fall back to broker-based verification,
preventing cross-execution failures.

---

## What the Library Handles vs. What You Decide

The library gives you the mechanical parts -- broker routing, selector
construction, tag generation, request filter wiring. What's left in your
provider test file is the set of decisions that vary per project:

- **Which token generator to use** -- OAuth client-credentials flow, a fake
  timestamp token, a static API key, or no auth at all.
- **Which state handlers to wire up** -- these depend on your database, ORM,
  and domain services.
- **Whether to use the broker or a local pact file** -- remote verification
  via `PACT_BROKER_BASE_URL` for CI, local `pactUrls` for development.
- **What to do on breaking changes** -- the `PACT_BREAKING_CHANGE` /
  `includeMainAndDeployed` toggle and how your CI surfaces it (PR checkbox,
  env var, manual flag).

Keep these decisions visible per-file; don't hide them in base classes.

---

## Related Pages

- [Concepts](../concepts) -- Overview of contract testing terminology and flows
- [Request Filter](../request-filter/) -- `createRequestFilter` and `noOpRequestFilter`
- [Consumer Helpers](../consumer-helpers/) -- `createProviderState` and `toJsonMap`
