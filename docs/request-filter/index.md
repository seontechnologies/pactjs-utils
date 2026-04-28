---
title: Request Filter
description: Inject dynamic auth headers during Pact provider verification with createRequestFilter and noOpRequestFilter.
---

# Request Filter

Modify outgoing requests during Pact provider verification -- most commonly to inject short-lived authorization tokens that cannot be baked into pact files.

## Features

- Injects a `Bearer` authorization header when one is not already present.
- Accepts an optional custom token generator; defaults to an ISO-8601 timestamp.
- Works transparently in both Express and non-Express (Lambda, plain HTTP) environments.
- Ships a no-op variant for providers that do not require auth injection.
- Plugs directly into `buildVerifierOptions` via its `requestFilter` parameter.

---

## The Problem

Pact files capture request/response shapes but exclude volatile values like auth tokens. During provider verification, the framework replays interactions against a running provider -- if it requires auth, every request fails with `401` unless a valid token is attached at verification time.

A request filter intercepts each request before it hits the provider, letting you attach headers on the fly. See the [background article on dev.to](https://dev.to/muratkeremozcan/building-custom-request-filters-for-pactjs-verifications-in-express-and-non-express-environments-4b5e) for more detail.

---

## When to Use Request Filters

Use a request filter when you need to attach **short-lived, per-request values** (like auth tokens) that cannot be baked into a pact file. Do not use request filters for static config, provider state setup, or body transformations. If your provider has no dynamic header injection needs, omit the `requestFilter` option -- `buildVerifierOptions` defaults to [`noOpRequestFilter`](./no-op-request-filter).

---

## Public API

| Export                                           | Kind     | Description                                                  |
| ------------------------------------------------ | -------- | ------------------------------------------------------------ |
| [`createRequestFilter`](./create-request-filter) | function | Creates a request filter that injects Bearer auth headers.   |
| [`noOpRequestFilter`](./no-op-request-filter)    | function | Pass-through filter for providers without auth requirements. |
| `RequestFilter`                                  | type     | The middleware signature shared by all request filters.      |

---

## Quick Usage

```typescript
// Full example: https://github.com/seontechnologies/pactjs-utils/blob/main/pact/http/provider/provider-contract.pacttest.ts
import {
  createRequestFilter,
  buildVerifierOptions
} from '@seontechnologies/pactjs-utils'

// 1. Default filter -- uses an ISO timestamp as the Bearer token
const defaultOptions = buildVerifierOptions({
  provider: 'MyProvider',
  port: '3000',
  includeMainAndDeployed: true,
  requestFilter: createRequestFilter()
})

// 2. Custom token generator -- e.g. fetch a real identity token
const customOptions = buildVerifierOptions({
  provider: 'MyProvider',
  port: '3000',
  includeMainAndDeployed: true,
  requestFilter: createRequestFilter({
    tokenGenerator: () => fetchIdentityToken()
  })
})
```

---

## Express vs Non-Express Environments

Pact's verifier proxy expects an Express-style `(req, res, next)` signature. Both `createRequestFilter` and `noOpRequestFilter` handle the difference automatically:

- **Express** (`next` is a function): calls `next()`.
- **Non-Express** (`next` is `undefined`): returns the request object directly.

You write the same code either way:

```typescript
// Works in Express
const options = buildVerifierOptions({
  provider: 'MyProvider',
  port: '3000',
  includeMainAndDeployed: true,
  requestFilter: createRequestFilter({
    tokenGenerator: () => getServiceToken()
  })
})

// Works identically in Lambda / plain HTTP
const options = buildVerifierOptions({
  provider: 'MyLambdaProvider',
  port: '3001',
  includeMainAndDeployed: true,
  requestFilter: createRequestFilter({
    tokenGenerator: () => getServiceToken()
  })
})
```

---

## Integration with buildVerifierOptions

`buildVerifierOptions` accepts an optional `requestFilter` parameter. When omitted, it defaults to `noOpRequestFilter`:

```typescript
buildVerifierOptions({
  provider: 'MyProvider',
  port: '3000',
  includeMainAndDeployed: true
  // requestFilter defaults to noOpRequestFilter
})
```

The `console.table` output from `buildVerifierOptions` shows which filter is active:

| Condition                                        | Logged value      |
| ------------------------------------------------ | ----------------- |
| `requestFilter` is `noOpRequestFilter` (default) | `Default (No-Op)` |
| Any other filter is provided                     | `Custom Provided` |

For the full `buildVerifierOptions` API, see [Provider Verifier](../provider-verifier/). For background on how request filters fit into the verification workflow, see [Concepts](../concepts).

---

## Related Pages

- [Provider Verifier](../provider-verifier/) -- `buildVerifierOptions` and `buildMessageVerifierOptions`
- [Concepts](../concepts) -- Overview of contract testing terminology and flows
- [Consumer Helpers](../consumer-helpers/) -- `createProviderState` and `toJsonMap`
