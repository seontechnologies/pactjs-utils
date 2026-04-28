---
title: Migration from Raw Pact
description: Step-by-step guide to migrating existing raw Pact.js tests to pactjs-utils.
---

# Migration from Raw Pact

If you already have Pact tests using raw `@pact-foundation/pact`, this guide
shows how to migrate them to `pactjs-utils` one piece at a time. Each step is
independent — you can adopt the library incrementally.

---

## Step 1: Replace manual JsonMap casting (consumer side)

**Before — raw Pact:**

```typescript
// Manual casting scattered across every test file
const movieId = 100
const params = { id: String(movieId) } // why String()? easy to forget

await pact.addInteraction().given('Has a movie with a specific ID', params)
```

**After — pactjs-utils:**

```typescript
// pact/http/consumer/movies-read.pacttest.ts
import { createProviderState } from '@seontechnologies/pactjs-utils'

const [stateName, stateParams] = createProviderState({
  name: 'Has a movie with a specific ID',
  params: { id: 100 } // numbers, objects, dates — all handled automatically
})

await pact.addInteraction().given(stateName, stateParams)
```

**What changes:** `toJsonMap` handles type coercion internally. Numbers stay
numbers, objects get stringified, `null`/`undefined` become `"null"`. No more
manual `String()` calls or `[object Object]` bugs.

---

## Step 2: Replace DIY request filters (provider side)

**Before — raw Pact:**

```typescript
// Hand-rolled Express middleware, duplicated per project
const requestFilter = (req: any, _res: any, next: () => void) => {
  const hasAuth = Object.keys(req.headers).some(
    (k) => k.toLowerCase() === 'authorization'
  )
  if (!hasAuth) {
    req.headers['authorization'] = `Bearer ${getToken()}`
  }
  if (next && typeof next === 'function') {
    next()
  } else {
    return req
  }
}
```

**After — pactjs-utils:**

```typescript
// pact/http/provider/provider-contract.pacttest.ts
import { createRequestFilter } from '@seontechnologies/pactjs-utils'

const requestFilter = createRequestFilter({
  tokenGenerator: () => generateAuthToken(pactAdminIdentity)
})
```

**What changes:** The Bearer prefix contract, case-insensitive header check,
and Express/non-Express environment handling are all built in. You only provide
the raw token value.

---

## Step 3: Replace verifier option assembly (provider side)

This is where the biggest reduction happens.

**Before — raw Pact:**

```typescript
import { Verifier } from '@pact-foundation/pact'

const options = {
  provider: 'SampleMoviesAPI',
  providerBaseUrl: `http://localhost:${process.env.PORT || '3001'}`,
  stateHandlers,
  requestFilter,
  publishVerificationResult: true,
  providerVersion: process.env.GITHUB_SHA || 'unknown',
  providerVersionBranch: process.env.GITHUB_BRANCH || 'main',
  providerVersionTags: getTagsSomehow(),
  pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  consumerVersionSelectors: [
    { matchingBranch: true },
    { mainBranch: true },
    { deployedOrReleased: true }
  ],
  enablePending: false,
  logLevel: 'info',
  beforeEach: async () => {
    await truncateTables()
  }
}

// And then somewhere else you handle PACT_PAYLOAD_URL...
// And breaking changes...
// And webhook URL parsing...

const verifier = new Verifier(options)
await verifier.verifyProvider()
```

**After — pactjs-utils:**

```typescript
// pact/http/provider/provider-contract.pacttest.ts
import {
  buildVerifierOptions,
  createRequestFilter
} from '@seontechnologies/pactjs-utils'
import { Verifier } from '@pact-foundation/pact'

const options = buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  stateHandlers,
  requestFilter: createRequestFilter({
    tokenGenerator: () => generateAuthToken(pactAdminIdentity)
  }),
  includeMainAndDeployed: process.env.PACT_BREAKING_CHANGE !== 'true',
  enablePending: process.env.PACT_ENABLE_PENDING === 'true',
  beforeEach: async () => {
    await truncateTables()
  }
})

const verifier = new Verifier(options)
await verifier.verifyProvider()
```

**What changes:**

- Consumer version selectors are built automatically from `includeMainAndDeployed`
- Broker URL, token, SHA, branch, and tags all read from env vars with sensible defaults
- `PACT_PAYLOAD_URL` webhook routing happens internally with cross-execution protection
- Breaking change coordination works through one boolean + one env var
- `console.table()` logs the resolved config for CI debugging

---

## Step 4: Centralize provider state factories (optional)

Once you have multiple consumer test files, state name strings get duplicated.
Extract them into typed factories using `ProviderStateInput`:

**Before:**

```typescript
// movies-read.pacttest.ts
createProviderState({ name: 'An existing movie exists', params: movie })

// movies-write.pacttest.ts
createProviderState({ name: 'An existing movie exists', params: movie })
// Typo risk: 'An existing movie exist' would silently fail on provider side
```

**After:**

```typescript
// pact/http/helpers/provider-states.ts
import type { ProviderStateInput } from '@seontechnologies/pactjs-utils'

export const movieExists = (
  movie: Movie | Omit<Movie, 'id'>
): ProviderStateInput => ({
  name: 'An existing movie exists',
  params: movie
})

// In any test file:
createProviderState(movieExists(movie))
```

**What changes:** State names are defined once. TypeScript catches
misspellings at compile time. Parameter shapes are enforced by the factory
signature.

---

## Migration checklist

- [ ] Install: `npm install -D @seontechnologies/pactjs-utils`
- [ ] Consumer tests: replace manual `JsonMap` casting with `createProviderState`
- [ ] Provider tests: replace hand-rolled request filters with `createRequestFilter`
- [ ] Provider tests: replace verifier option assembly with `buildVerifierOptions`
- [ ] Message tests: replace message verifier setup with `buildMessageVerifierOptions`
- [ ] CI workflows: set `PACT_BROKER_BASE_URL`, `PACT_BROKER_TOKEN`, `GITHUB_SHA`, `GITHUB_BRANCH` as env vars
- [ ] (Optional) Extract provider state factories using `ProviderStateInput`
- [ ] (Optional) Copy CI workflow templates from `scripts/templates/`

Each step can be done independently — you don't need to migrate everything at
once.

---

## Related Pages

- [Installation](/installation) — Setup and project structure
- [Concepts](/concepts) — Architecture diagram and testing model
- [Provider Verifier](/provider-verifier/) — Full `buildVerifierOptions` API
- [Request Filter](/request-filter/) — Full `createRequestFilter` API
- [Consumer Helpers](/consumer-helpers/) — Full `createProviderState` API
