---
title: Consumer Helpers
description: Type-safe utilities for provider states and reusable JSON interaction builders in Pact consumer tests.
---

# Consumer Helpers

Utilities that solve the type mismatch between TypeScript's rich type system and
Pact's `JsonMap` communication protocol, giving you type-safe provider state
setup on the consumer side.

## Features

- **Automatic type coercion** -- converts arbitrary TypeScript values into
  Pact-compatible `JsonMap` entries without manual casting.
- **Tuple-based API** -- `createProviderState` returns a `[string, JsonMap]`
  tuple that spreads directly into `.given()` on a Pact interaction builder.
- **Curried interaction builder** -- `setJsonContent` configures `query`,
  `headers`, and `jsonBody` for Pact request/response callbacks.
- **Exported input type** -- `ProviderStateInput` lets you build typed helper
  functions and factories around provider states.

---

## The Problem

Pact communicates provider states as JSON. On the wire, every parameter value
must conform to `AnyJson` (a union of `boolean | number | string | null | JsonArray | JsonMap`). In practice this means every value in the params object
must already be one of those types -- a constraint captured by the `JsonMap`
type:

```typescript
type AnyJson = boolean | number | string | null | JsonArray | JsonMap
type JsonMap = { [key: string]: AnyJson }
```

TypeScript application code, however, uses richer types: `Date` objects, nested
domain models, optional fields (`undefined`), and arrays of mixed content. When
you try to pass a typed domain object straight into `.given()`, the
compiler rightly complains that your `Record<string, unknown>` is not assignable
to `JsonMap`.

The common workaround is manual conversion at every call site:

```typescript
// Error-prone: manual coercion scattered across consumer tests
const testId = 100
const params = { id: String(testId) } // why String()? easy to forget
pact.addInteraction().given('Has a movie with a specific ID', params)
```

This is fragile. Forget to stringify a nested object and the provider receives
`[object Object]`. Pass `null` and the key disappears from the JSON payload.
The failures surface on the _provider_ side, far from the consumer code that
caused them, making diagnosis painful.

For a deeper discussion of this problem, see
[Strengthening Pact Contract Testing with TypeScript and Data Abstraction](https://dev.to/muratkeremozcan/-strengthening-pact-contract-testing-with-typescript-and-data-abstraction-16hc).

---

## Public API

The library exports six items from `consumer-helpers`:

| Export                                           | Kind     | Description                                                                |
| ------------------------------------------------ | -------- | -------------------------------------------------------------------------- |
| [`toJsonMap`](./to-json-map)                     | function | Converts `Record<string, unknown>` to `JsonMap`.                           |
| [`createProviderState`](./create-provider-state) | function | Returns a `[string, JsonMap]` tuple for `.given()`.                        |
| [`setJsonContent`](./set-json-content)           | function | Curried helper for `.withRequest(...)` / `.willRespondWith(...)` builders. |
| [`setJsonBody`](./set-json-body)                 | function | Body-only alias of `setJsonContent({ body })`.                             |
| `ProviderStateInput`                             | type     | Input shape accepted by `createProviderState`.                             |
| `JsonContentInput`                               | type     | Input shape for `setJsonContent`.                                          |

All are re-exported from the package entry point:

```typescript
import {
  createProviderState,
  toJsonMap,
  setJsonContent,
  setJsonBody
} from '@seontechnologies/pactjs-utils'
import type {
  ProviderStateInput,
  JsonContentInput
} from '@seontechnologies/pactjs-utils'
```

---

## Common Questions

### Why are test values hardcoded in consumer tests?

Values like `id: 1`, `name: 'My movie'`, `testId: 100` are **arbitrary
placeholders**, not real provider data. They serve two purposes:

1. **Mock server**: during the consumer test, the mock server uses these values
   to return predictable responses so your assertions work.
2. **Provider state params**: these values flow into the contract JSON and are
   passed to the provider's state handler during verification.

The provider state handler receives the placeholder values and creates matching
records in its local database. The consumer never needs to know about the
provider's DB, fixtures, or test data strategy.

### Do my placeholder IDs need to match real provider data?

No. The whole point of provider states is to decouple the consumer from the
provider's data layer. The consumer says _"a movie with ID 100 exists"_ via
`.given()`, and the provider's state handler makes it true -- by inserting a
row, returning a fixture, or whatever works for that service.

Using real provider database IDs would couple the consumer to the provider's
test data, defeating the purpose of contract testing.

### Can I reuse the same test values across multiple test files?

Yes -- and it's actually a good practice. Each interaction is uniquely
identified by its `uponReceiving` description + `.given()` state, not by the
placeholder values. Two test files can both use `testId: 100` without
conflicting.

On the **provider side**, reusing values simplifies state handlers. If five
interactions across different files all reference `{ id: 100 }`, the state
handler only needs to ensure that one record exists. State handlers are
typically idempotent (check if exists, create if not), so shared values mean
fewer inserts and simpler provider setup.

The one case where you **should** use different values: when you need to test
different states of the same entity type within the same contract. For example,
`movieExists(100)` for happy paths vs `movieNotFound(999)` for error paths --
different state names need different values to avoid contradicting each other.

```typescript
// Shared across test files -- fine
const testId = 100

// Happy path: movie exists
await pact
  .addInteraction()
  .given(...createProviderState(hasMovieWithId(testId)))

// Error path in another file: different ID, different state
await pact
  .addInteraction()
  .given('No movies exist')
  .withRequest('GET', `/movies/999`)
  .willRespondWith(
    404,
    setJsonBody({ error: string('not found'), status: 404 })
  )
```

### Should I use matchers on request bodies?

Generally, no. Follow [Postel's Law](https://en.wikipedia.org/wiki/Robustness_principle):
be strict with what you send, loose with what you accept. The consumer knows
exactly what it sends, so request bodies should use exact values. Use matchers
(`string()`, `integer()`, `like()`) on **response** bodies, where the provider
may return different values each time. Wrapping request fields in `like()`
weakens the contract without adding value.

---
