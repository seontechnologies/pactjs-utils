---
title: toJsonMap
description: Convert arbitrary TypeScript objects to Pact-compatible JsonMap format.
---

# toJsonMap

```typescript
import { toJsonMap } from '@seontechnologies/pactjs-utils'
```

```typescript
const toJsonMap = (obj: Record<string, unknown>): JsonMap
```

Iterates over every key/value pair and coerces the value into an `AnyJson`-
compatible form. The function is deterministic: every JavaScript type maps to
exactly one output form.

## Conversion Table

| Input Type   | Output            | Example                                                                                               |
| ------------ | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `null`       | `"null"` (string) | `{ a: null }` --> `{ a: "null" }`                                                                     |
| `undefined`  | `"null"` (string) | `{ a: undefined }` --> `{ a: "null" }`                                                                |
| Plain object | `JSON.stringify`  | `{ director: { firstName: "Christopher" } }` --> `{ director: '{"firstName":"Christopher"}' }`        |
| `number`     | Preserved         | `{ year: 2010, rating: 8.8 }` --> `{ year: 2010, rating: 8.8 }`                                       |
| `boolean`    | Preserved         | `{ released: true }` --> `{ released: true }`                                                         |
| `Date`       | ISO 8601 string   | `{ releaseDate: new Date('2024-09-01T12:00:00Z') }` --> `{ releaseDate: "2024-09-01T12:00:00.000Z" }` |
| `Array`      | `String(value)`   | `{ tags: ["Sci-Fi", "Thriller"] }` --> `{ tags: "Sci-Fi,Thriller" }`                                  |
| `string`     | `String(value)`   | `{ name: "Inception" }` --> `{ name: "Inception" }`                                                   |

**Note:** Arrays fall through to the `else` branch and are converted via
`String()`, which joins elements with commas (e.g., `["a", "b"]` becomes
`"a,b"`).

## Example

```typescript
import { toJsonMap } from '@seontechnologies/pactjs-utils'

const result = toJsonMap({
  name: 'Inception',
  year: 2010,
  released: true,
  director: { firstName: 'Christopher' },
  releaseDate: new Date('2024-01-01T00:00:00.000Z'),
  tags: ['Sci-Fi'],
  deleted: null,
  extra: undefined
})

// result:
// {
//   name: 'Inception',
//   year: 2010,
//   released: true,
//   director: '{"firstName":"Christopher"}',
//   releaseDate: '2024-01-01T00:00:00.000Z',
//   tags: 'Sci-Fi',
//   deleted: 'null',
//   extra: 'null',
// }
```

`toJsonMap` is a public export. You can use it directly when you need a
`JsonMap` outside of provider state setup -- for example when building custom
Pact interaction bodies. In most consumer tests, however, you will use it
indirectly through [`createProviderState`](./create-provider-state).

## Related

- [createProviderState](./create-provider-state) -- wraps `toJsonMap` for provider state setup
- [Consumer Helpers Overview](./) -- all consumer-side utilities
