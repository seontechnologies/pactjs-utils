---
title: setJsonBody
description: Convenience alias for setting only the JSON body in Pact interactions.
---

# setJsonBody

```typescript
import { setJsonBody } from '@seontechnologies/pactjs-utils'
```

```typescript
const setJsonBody = (body: unknown) => setJsonContent({ body })
```

`setJsonBody` is a convenience alias when you only need `jsonBody` and prefer the shorter call style.

It is a shorthand for [`setJsonContent({ body: ... })`](./set-json-content).

```typescript
await pact.addInteraction().willRespondWith(200, setJsonBody({ status: 200 }))
```

## Example from an Actual Pact Test

```typescript
// Full example: https://github.com/seontechnologies/pactjs-utils/blob/main/pact/http/consumer/movies-write.pacttest.ts
// ./pact/http/consumer/movies-write.pacttest.ts
await pact
  .addInteraction()
  .given('No movies exist')
  .uponReceiving('a request to delete a non-existing movie')
  .withRequest('DELETE', `/movies/${testId}`)
  .willRespondWith(404, setJsonBody({ error: string(error), status: 404 }))
```

For any request query/header setup, use [`setJsonContent`](./set-json-content).

## Related

- [setJsonContent](./set-json-content) -- full-featured version with query and headers support
- [Consumer Helpers Overview](./) -- all consumer-side utilities
