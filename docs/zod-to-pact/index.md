---
title: Zod to Pact
description: Derive Pact V3 matchers from Zod schemas, eliminating duplication between type definitions and contract tests.
---

# Zod to Pact

Utilities for converting Zod schemas into Pact V3 matchers so you don't maintain
two representations of the same response shape.

## Features

- **Schema-driven matchers** — `z.string()` → `string()`, `z.number().int()` →
  `integer()`, `z.number()` → `decimal()`, `z.object()` and `z.array()` handled
  recursively.
- **Flexible example sourcing** — pass example values as a second argument, or
  let the utility extract them from `.openapi({ example: ... })` metadata
  (requires `@asteasolutions/zod-to-openapi`).
- **Consumer-controlled scope** — you decide which fields to include by choosing
  which schema to pass, keeping contracts lean and consumer-driven.

---

## The Problem

Teams that define API response models in Zod typically redefine the same shape
again as hand-written Pact matchers:

```typescript
// Shared schema — defined once
const MovieSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  year: z.number().int(),
  rating: z.number(),
  director: z.string()
})

// Pact consumer test — same shape, defined again by hand
// pact/http/consumer/movies-read.pacttest.ts
const propMatcherNoId = (movie: Omit<Movie, 'id'>) => ({
  name: string(movie.name),
  year: integer(movie.year),
  rating: decimal(movie.rating),
  director: string(movie.director)
})
```

Every time the schema changes, both definitions must be updated in sync.
Miss one and the contract drifts silently from the actual response shape.

---

## A Word of Caution

Converting a Zod schema to Pact matchers is only a good idea when the schema
represents **exactly what the consumer reads** — not the full server-side
response definition.

If you pass the provider's full 20-field schema, you create a contract that
requires the provider to return all 20 fields. That breaks
[consumer-driven testing](https://docs.pact.io/getting_started/how_pact_works#consumer-driven-contracts):
the consumer should only assert what it actually uses, giving the provider
maximum flexibility to evolve fields the consumer ignores.

The safe pattern is a **consumer-curated schema** that lives alongside the Pact
tests, not a re-import of the shared server-side schema:

```typescript
// pact/http/helpers/consumer-schemas.ts
import { z } from 'zod'

// Only the fields this consumer actually reads
export const ConsumerMovieSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  year: z.number().int(),
  rating: z.number(),
  director: z.string()
})
```

---

## Public API

| Export                                        | Kind     | Description                                                   |
| --------------------------------------------- | -------- | ------------------------------------------------------------- |
| [`zodToPactMatchers`](./zod-to-pact-matchers) | function | Converts a Zod schema + example values into Pact V3 matchers. |

All re-exported from the package entry point:

```typescript
import { zodToPactMatchers } from '@seontechnologies/pactjs-utils'
```

---

## Common Questions

### Which Pact matcher does each Zod type produce?

| Zod type                        | Pact matcher                                                     |
| ------------------------------- | ---------------------------------------------------------------- |
| `z.string()`                    | `string(example)`                                                |
| `z.number().int()`              | `integer(example)`                                               |
| `z.number()`                    | `decimal(example)`                                               |
| `z.boolean()`                   | `boolean(example)`                                               |
| `z.null()`                      | `nullValue()`                                                    |
| `z.object({...})`               | object with each field converted recursively                     |
| `z.array(T)`                    | `eachLike(matchers for T)`                                       |
| `z.optional()` / `z.nullable()` | unwraps to inner type                                            |
| `z.union([A, B])`               | uses first option (`A`)                                          |
| `z.literal(v)`                  | `string`, `integer`, `decimal`, or `boolean` based on value type |
| `z.enum([...])`                 | `string(firstValue)`                                             |

### Where do example values come from?

Resolution order:

1. The `example` argument you pass (highest priority)
2. `.openapi({ example: ... })` metadata on the schema field (if `@asteasolutions/zod-to-openapi` is installed)
3. A type-appropriate default (`'string'`, `1.0`, `true`)

### What if my consumer schema has optional fields?

Include or exclude optional fields deliberately. If you include an optional field
in your consumer schema, the contract asserts the provider must return it. If
you omit it, the provider can include or exclude it freely.

### Related

- [zodToPactMatchers](./zod-to-pact-matchers) — function reference
- [Consumer Helpers](./../consumer-helpers/) — provider state setup and JSON builders
