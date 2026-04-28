---
title: setJsonContent
description: Curried helper for building Pact request and response JSON interactions.
---

# setJsonContent

```typescript
import { setJsonContent } from '@seontechnologies/pactjs-utils'
import type { JsonContentInput } from '@seontechnologies/pactjs-utils'
```

```typescript
type JsonContentInput = {
  body?: unknown
  headers?: TemplateHeaders
  query?: TemplateQuery
}

const setJsonContent = (input: JsonContentInput) => (builder) => void
```

A curried helper for Pact V4 HTTP builder callbacks that removes repetitive
inline lambdas around `builder.query(...)`, `builder.headers(...)`, and
`builder.jsonBody(...)`.

It is intentionally builder-agnostic:

- On request builders (`.withRequest(...)`), `query`, `headers`, and `body` are applied
- On response builders (`.willRespondWith(...)`), `headers` and `body` are applied, and `query` is ignored

## Examples

```typescript
// Full example: https://github.com/seontechnologies/pactjs-utils/blob/main/pact/http/consumer/movies-read.pacttest.ts
import { MatchersV3 } from '@pact-foundation/pact'
import { setJsonContent } from '@seontechnologies/pactjs-utils'

const { like, string, integer } = MatchersV3

await pact
  .addInteraction()
  .uponReceiving('a request to get a movie by name')
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
        data: {
          id: integer(1),
          name: string('Inception'),
          year: integer(2010)
        }
      }
    })
  )
```

You can also use headers for either side:

```typescript
setJsonContent({
  headers: { 'x-correlation-id': 'pact-test' },
  body: { ok: true }
})
```

## Related

- [setJsonBody](./set-json-body) -- convenience alias for body-only usage
- [Consumer Helpers Overview](./) -- all consumer-side utilities
