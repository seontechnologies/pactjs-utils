---
title: buildMessageVerifierOptions
description: Build PactMessageProviderOptions for message-based Pact provider verification.
---

# buildMessageVerifierOptions

```typescript
import { buildMessageVerifierOptions } from '@seontechnologies/pactjs-utils'
```

Builds a `PactMessageProviderOptions` object for message-based (Kafka, SQS,
etc.) provider verification. The parameter set is nearly identical to
[`buildVerifierOptions`](./build-verifier-options), but replaces `port` and `requestFilter` with
`messageProviders`.

```typescript
// Full example: https://github.com/seontechnologies/pactjs-utils/blob/main/pact/message/provider/provider-message-queue.pacttest.ts
const options = buildMessageVerifierOptions({
  provider: 'SampleMoviesAPI-event-producer',
  messageProviders: {
    'a movie event': () => Promise.resolve({ id: 1, name: 'Test Movie' })
  },
  includeMainAndDeployed: true
})
```

## Parameters

| Name                        | Type / Default                             | What it does                                                                                                                    |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                  | `string` — **required**                    | Provider name; must match consumer message pact definitions.                                                                    |
| `messageProviders`          | `MessageProviders` — **required**          | Maps message description strings to functions returning the payload.                                                            |
| `includeMainAndDeployed`    | `boolean` — **required**                   | Controls selector breadth. Same behavior as `buildVerifierOptions`.                                                             |
| `stateHandlers`             | `StateHandlers` — optional                 | Provider state setup/teardown functions.                                                                                        |
| `consumer`                  | `string` — optional                        | Scopes selectors to a single consumer.                                                                                          |
| `enablePending`             | `boolean` — `false`                        | When `true`, pending pacts do not fail the provider build. See [enablePending — bridge, not bypass](../concepts#enablepending). |
| `logLevel`                  | `string` — `'info'`                        | Log verbosity (`'trace'` through `'error'`).                                                                                    |
| `publishVerificationResult` | `boolean` — `true`                         | Publish results to broker.                                                                                                      |
| `pactBrokerToken`           | `string` — `env.PACT_BROKER_TOKEN`         | Broker auth token.                                                                                                              |
| `providerVersion`           | `string` — `env.GITHUB_SHA \|\| 'unknown'` | Provider version string.                                                                                                        |
| `providerVersionBranch`     | `string` — `env.GITHUB_BRANCH \|\| 'main'` | Branch name.                                                                                                                    |
| `providerVersionTags`       | `string[]` — `getProviderVersionTags()`    | Provider version tags.                                                                                                          |
| `pactUrls`                  | `string[]` — optional                      | Local pact file paths. Bypasses broker when provided.                                                                           |
| `pactBrokerUrl`             | `string` — `env.PACT_BROKER_BASE_URL`      | Broker base URL.                                                                                                                |
| `pactPayloadUrl`            | `string` — `env.PACT_PAYLOAD_URL`          | Webhook payload URL.                                                                                                            |

## Return Value

Returns a `PactMessageProviderOptions` object from `@pact-foundation/pact`.

## Related

- [buildVerifierOptions](./build-verifier-options) -- HTTP provider variant
- [Provider Verifier Overview](./) -- examples and environment variables
