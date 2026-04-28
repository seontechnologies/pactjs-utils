---
title: createProviderState
description: Create type-safe provider state tuples for Pact consumer tests.
---

# createProviderState

```typescript
import { createProviderState } from '@seontechnologies/pactjs-utils'
import type { ProviderStateInput } from '@seontechnologies/pactjs-utils'
```

```typescript
type ProviderStateInput = {
  name: string
  params: Record<string, unknown>
}

const createProviderState = ({
  name,
  params,
}: ProviderStateInput): [string, JsonMap]
```

A thin wrapper that pairs a state name with its [`toJsonMap`](./to-json-map)-converted params.
The return type is a two-element tuple so that you can spread it directly into
Pact's interaction `.given()` method:

```typescript
// Full example: https://github.com/seontechnologies/pactjs-utils/blob/main/pact/http/consumer/movies-read.pacttest.ts
// pact/http/consumer/movies-read.pacttest.ts
const [stateName, stateParams] = createProviderState({
  name: 'An existing movie exists',
  params: { name: 'Inception', year: 2010 }
})

await pact.addInteraction().given(stateName, stateParams)
```

## Why a Tuple?

`.given()` on a Pact interaction builder accepts `(stateName: string, params?: JsonMap)`. By
returning `[string, JsonMap]` the spread syntax maps each element to the
corresponding positional argument. This keeps call sites compact and
eliminates the intermediate destructure when you do not need to inspect the
values.

If you do need the parts separately -- for logging, assertions, or building
composite states -- destructure as usual:

```typescript
const [stateName, stateParams] = createProviderState({
  name: 'A movie with details',
  params: { title: 'Inception', year: 2010, director: { name: 'Nolan' } }
})

console.log(stateName) // 'A movie with details'
console.log(stateParams) // { title: 'Inception', year: 2010, director: '{"name":"Nolan"}' }
```

---

## `ProviderStateInput` Type

Exported so that you can build typed helper functions and factories around
provider states without importing the internal shape:

```typescript
import type { ProviderStateInput } from '@seontechnologies/pactjs-utils'

const movieExistsState = (movie: Movie): ProviderStateInput => ({
  name: 'An existing movie exists',
  params: movie
})
```

This pattern keeps state name strings and their expected parameter shapes
co-located, reducing duplication across consumer test files.

---

## Real-World Example: Movie CRUD States

A typical consumer test suite for a movie API defines several provider states.
Without `createProviderState`, each call site manually converts params:

```typescript
// Before: manual conversion, error-prone
pact
  .addInteraction()
  .given('Has a movie with a specific ID', { id: String(testId) })

pact.addInteraction().given('An existing movie exists', {
  name: String(movie.name),
  year: String(movie.year) // why stringify a number? Pact handles numbers fine
})
```

With `createProviderState`, conversion is handled uniformly:

```typescript
// pact/http/consumer/movies-read.pacttest.ts, pact/http/consumer/movies-write.pacttest.ts
import { createProviderState } from '@seontechnologies/pactjs-utils'

// GET /movies/:id -- needs an existing movie with known ID
const [stateName, stateParams] = createProviderState({
  name: 'Has a movie with a specific ID',
  params: { id: 100 }
})
await pact.addInteraction().given(stateName, stateParams)

// POST /movies -- duplicate check, movie already exists
const movie = { name: 'Inception', year: 2010 }
const existsState = createProviderState({
  name: 'An existing movie exists',
  params: movie
})
await pact.addInteraction().given(...existsState)

// DELETE /movies/:id -- movie must exist before deletion
const deleteState = createProviderState({
  name: 'Has a movie with a specific ID',
  params: { id: 999 }
})
await pact.addInteraction().given(...deleteState)

// GET /movies -- empty state
const emptyState = createProviderState({
  name: 'No movies exist',
  params: { count: 0 }
})
await pact.addInteraction().given(...emptyState)
```

You can extract a set of factory functions to keep state definitions DRY across
test files:

```typescript
// pact/http/helpers/provider-states.ts
import type { Movie } from '@shared/types/movie-types'
import type { ProviderStateInput } from '@seontechnologies/pactjs-utils'

export const movieExists = (
  movie: Movie | Omit<Movie, 'id'>
): ProviderStateInput => ({
  name: 'An existing movie exists',
  params: movie
})

export const hasMovieWithId = (id: number): ProviderStateInput => ({
  name: 'Has a movie with a specific ID',
  params: { id }
})

// In tests:
await pact.addInteraction().given(...createProviderState(hasMovieWithId(100)))

await pact.addInteraction().given(...createProviderState(movieExists(movie)))
```

---

## Provider-Side Alignment

The consumer helpers handle one half of the contract. On the provider side,
state handlers receive the `JsonMap` params as `AnyJson`. You need to cast back
to a typed shape so that the handler code is safe to work with.

Important: this cast is about TypeScript types, not runtime rehydration.
`toJsonMap` converts `null` and `undefined` into the literal string `"null"`,
and serializes plain objects with `JSON.stringify`. Provider handlers may need
to parse/re-hydrate those values before calling domain logic.

Practical pattern:

```typescript
const raw = params as Record<string, AnyJson>
const director =
  typeof raw.director === 'string' ? JSON.parse(raw.director) : undefined
const deletedAt = raw.deletedAt === 'null' ? null : raw.deletedAt
```

Define narrow param types that match what each state expects:

```typescript
// pact/http/helpers/state-handlers.ts
import type { AnyJson } from '@seontechnologies/pactjs-utils'

type HasMovieWithSpecificIDParams = { id: number }
type ExistingMovieParams = {
  name: string
  year: number
  rating: number
  director: string
  id?: number
}

export const stateHandlers = {
  'Has a movie with a specific ID': async (parameters?: AnyJson) => {
    const params = (parameters ?? {}) as HasMovieWithSpecificIDParams
    const { id } = params

    const res = await movieService.getMovieById(id!)
    if (res.status !== 200) {
      await movieService.addMovie(
        { name: 'Test Movie', year: 2022, rating: 7.5, director: 'Director' },
        id
      )
    }
    return { description: `Movie with ID ${id} is set up.` }
  },

  'An existing movie exists': async (parameters?: AnyJson) => {
    const params = (parameters ?? {}) as ExistingMovieParams
    const { name, year, rating, director } = params

    const res = await movieService.getMovieByName(name!)
    if (res.status !== 200) {
      await movieService.addMovie({
        name: name!,
        year: year!,
        rating: rating!,
        director: director!
      })
    }
    return { description: `Movie with name "${name}" is set up.` }
  },

  'No movies exist': async () => {
    await truncateTables()
    return { description: 'State with no movies achieved.' }
  }
}
```

The cast is safe because the consumer test defined those exact params through
`createProviderState`, and the pact file captures the contract. If the consumer
changes the param shape, the contract verification will fail, surfacing the
mismatch before it reaches production.

For more on state handler configuration and the `StateHandlers` type, see the
[Provider Verifier](../provider-verifier/) documentation. For background on the
Pact type system (`AnyJson`, `JsonMap`, `StateFunc`), see
[Concepts](../concepts).

## Related

- [toJsonMap](./to-json-map) -- the underlying conversion function
- [Consumer Helpers Overview](./) -- all consumer-side utilities
- [Provider Verifier](../provider-verifier/) -- state handler configuration
