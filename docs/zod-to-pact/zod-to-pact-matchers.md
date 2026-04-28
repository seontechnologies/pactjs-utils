---
title: zodToPactMatchers
description: Convert a Zod schema and example values into Pact V3 matchers.
---

# zodToPactMatchers

```typescript
import { zodToPactMatchers } from '@seontechnologies/pactjs-utils'
```

```typescript
const zodToPactMatchers = (schema: z.ZodTypeAny, example?: unknown): unknown
```

Converts a Zod schema into a structure of Pact V3 matchers. Each Zod type maps
to the appropriate matcher (`string()`, `integer()`, `decimal()`, etc.). Nested
objects and arrays are handled recursively.

Example values resolve in priority order:

1. The `example` argument you pass
2. `.openapi({ example: ... })` metadata on the schema field
3. A type-appropriate default (`'string'`, `1.0`, `true`)

---

## Basic Usage

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
// pact/http/consumer/movies-read-zod-to-pact.pacttest.ts
import { MatchersV3, PactV4 } from '@pact-foundation/pact'
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
```

The `movie` object provides example values; `ConsumerMovieSchema` provides the
types. The result is:

```typescript
{
  id: integer(1),
  name: string('My movie'),
  year: integer(1999),
  rating: decimal(8.5),
  director: string('John Doe')
}
```

---

## Replacing Hand-Written Matcher Helpers

Before `zodToPactMatchers`, consumer tests often defined local helper functions
to build matcher objects. Here is the same POST `/movies` interaction before and after:

::: code-group

```typescript [movies-write.pacttest.ts (before)]
import { MatchersV3, PactV4 } from '@pact-foundation/pact'
import {
  createProviderState,
  setJsonContent
} from '@seontechnologies/pactjs-utils'

const { integer, decimal, string } = MatchersV3

// Local helper — duplicates the shape defined in Movie type
const propMatcherNoId = (movie: Omit<Movie, 'id'>) => ({
  name: string(movie.name),
  year: integer(movie.year),
  rating: decimal(movie.rating),
  director: string(movie.director)
})

await pact
  .addInteraction()
  .given('No movies exist')
  .uponReceiving('a request to add a new movie')
  .withRequest('POST', '/movies', setJsonContent({ body: movieWithoutId }))
  .willRespondWith(
    200,
    setJsonContent({
      body: {
        status: 200,
        data: {
          id: integer(),
          ...propMatcherNoId(movieWithoutId)
        }
      }
    })
  )
```

```typescript [movies-write-zod-to-pact.pacttest.ts (after)]
import { PactV4 } from '@pact-foundation/pact'
import {
  createProviderState,
  setJsonContent,
  zodToPactMatchers
} from '@seontechnologies/pactjs-utils'
import { ConsumerMovieSchema } from '../helpers/consumer-schemas'

// No local helper — schema defines types, plain object provides examples
await pact
  .addInteraction()
  .given('No movies exist')
  .uponReceiving('a request to add a new movie')
  .withRequest('POST', '/movies', setJsonContent({ body: movieWithoutId }))
  .willRespondWith(
    200,
    setJsonContent({
      body: {
        status: 200,
        data: zodToPactMatchers(ConsumerMovieSchema, {
          id: 1,
          ...movieWithoutId
        })
      }
    })
  )
```

:::

The schema defines the types; the plain object provides the example values.
No more synchronising two representations of the same shape.

---

## Message Pact Tests

Works identically for Kafka / message pact tests:

::: code-group

```typescript [movie-events.pacttest.ts (before)]
import { PactV4, MatchersV3 } from '@pact-foundation/pact'

const { like, string, integer, decimal } = MatchersV3

// Hand-written matcher object — must stay in sync with the Movie type
const movieValue = {
  id: integer(1),
  name: string('Inception'),
  year: integer(2010),
  rating: decimal(8.8),
  director: string('Christopher Nolan')
}

await messagePact
  .addAsynchronousInteraction()
  .given('An existing movie exists')
  .expectsToReceive(`a movie-${action} event`, (builder) => {
    builder.withJSONContent({
      topic: string(`movie-${action}`),
      messages: [{ key: string('1'), value: like(movieValue) }]
    })
  })
```

```typescript [movie-events-zod-to-pact.pacttest.ts (after)]
import { PactV4, MatchersV3 } from '@pact-foundation/pact'
import { zodToPactMatchers } from '@seontechnologies/pactjs-utils'
import { ConsumerMovieSchema } from '../../http/helpers/consumer-schemas'

const { string } = MatchersV3

// Schema-derived matchers — no manual matcher construction
const movieValue = zodToPactMatchers(ConsumerMovieSchema, {
  id: 1,
  name: 'Inception',
  year: 2010,
  rating: 8.8,
  director: 'Christopher Nolan'
})

await messagePact
  .addAsynchronousInteraction()
  .given('An existing movie exists')
  .expectsToReceive(`a movie-${action} event`, (builder) => {
    builder.withJSONContent({
      topic: string(`movie-${action}`),
      messages: [{ key: string('1'), value: movieValue }]
    })
  })
```

:::

Note: `zodToPactMatchers` on an object schema already wraps each field in the
right matcher, so the extra `like()` wrapper from the before version is not
needed — each field carries its own type constraint.

---

## With OpenAPI Examples

If your schemas carry `.openapi({ example: ... })` metadata (via
`@asteasolutions/zod-to-openapi`), you can omit the second argument entirely:

```typescript
// sample-app/shared/types/schema.ts
import { z } from 'zod'
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
extendZodWithOpenApi(z)

const MovieWithMetaSchema = z.object({
  name: z.string().openapi({ example: 'Inception' }),
  year: z.number().int().openapi({ example: 2010 }),
  rating: z.number().openapi({ example: 8.5 }),
  director: z.string().openapi({ example: 'Christopher Nolan' })
})

// No example argument needed — extracted from .openapi() metadata
zodToPactMatchers(MovieWithMetaSchema)
// { name: string('Inception'), year: integer(2010), rating: decimal(8.5), director: string('Christopher Nolan') }
```

`@asteasolutions/zod-to-openapi` is an optional dependency. When it is not
installed, example extraction is silently skipped and type-appropriate defaults
are used instead.

---

## Consumer-Curated Schemas

The key design decision is **which schema to pass**. Passing a shared full-response
schema produces a contract that requires the provider to return every field in
that schema — including ones the consumer never reads. This turns contract tests
into schema tests and blocks the provider from safely deprecating unused fields.

The recommended pattern is a consumer-curated schema that lives next to the Pact
tests and includes only what the consumer actually reads:

```typescript
// pact/http/helpers/consumer-schemas.ts
import { z } from 'zod'

// Consumer reads all movie fields — include all
export const ConsumerMovieSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  year: z.number().int(),
  rating: z.number(),
  director: z.string()
})

// Consumer only reads name + year from this endpoint — omit the rest
export const ConsumerMovieWithoutIdSchema = z.object({
  name: z.string(),
  year: z.number().int(),
  rating: z.number(),
  director: z.string()
})
```

For background on consumer-driven contracts and why over-specifying fields is
harmful, see the
[Pact documentation on consumer-driven contracts](https://docs.pact.io/getting_started/how_pact_works#consumer-driven-contracts).

---

## Related

- [Zod to Pact Overview](./) — type mapping table and design rationale
- [Consumer Helpers](./../consumer-helpers/) — `setJsonContent`, `createProviderState`
