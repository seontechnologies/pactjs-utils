---
title: createRequestFilter
description: Create a request filter that injects Bearer authorization headers during Pact provider verification.
---

# createRequestFilter

```typescript
import { createRequestFilter } from '@seontechnologies/pactjs-utils'
```

Higher-order function that returns a `RequestFilter`.

```typescript
function createRequestFilter(options?: {
  tokenGenerator?: () => string
}): RequestFilter
```

## Options

| Property         | Type           | Default                          | Description                                                                     |
| ---------------- | -------------- | -------------------------------- | ------------------------------------------------------------------------------- |
| `tokenGenerator` | `() => string` | `() => new Date().toISOString()` | Returns the **raw** token value. The filter prepends `"Bearer "` automatically. |

### Option Shape

```typescript
type RequestFilterOptions = {
  tokenGenerator?: () => string
}
```

---

## Bearer Prefix Contract

The token generator returns the **raw value only**. `createRequestFilter` prepends `"Bearer "` once, so you never double-prefix:

```typescript
// tokenGenerator returns "my-custom-token"
// Header becomes: Authorization: Bearer my-custom-token

const filter = createRequestFilter({
  tokenGenerator: () => 'my-custom-token'
})
```

---

## Existing Header Preservation

If the request already carries an `Authorization` header (any casing), the filter leaves it untouched:

```typescript
// Request already has { Authorization: 'Bearer existing-token' }
// createRequestFilter will NOT overwrite it
```

The check is case-insensitive, so both `Authorization` and `authorization` are respected.

---

## `RequestFilter` Type

Both `createRequestFilter` and [`noOpRequestFilter`](./no-op-request-filter) satisfy the `RequestFilter` type exported from the library:

```typescript
type RequestFilter = (
  req: {
    headers: Record<string, string | string[] | undefined>
    body?: unknown
  },
  res: unknown,
  next: () => void | undefined
) => unknown
```

See [Express vs Non-Express Environments](../request-filter/#express-vs-non-express-environments) for how non-Express runtimes are handled.

---

## Real-World Example: Identity Token Injection

For providers that validate OAuth2/OIDC tokens, fetch the token async in `beforeAll`, cache it, and return it synchronously from `tokenGenerator`:

```typescript
// Full example: https://github.com/seontechnologies/pactjs-utils/blob/main/pact/http/provider/provider-contract.pacttest.ts
import {
  createRequestFilter,
  buildVerifierOptions
} from '@seontechnologies/pactjs-utils'

async function fetchIdentityToken(): Promise<string> {
  const response = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      audience: 'https://api.example.com'
    })
  })
  const data = await response.json()
  return data.access_token // raw token -- filter adds "Bearer " prefix
}

let cachedToken: string | undefined

const requestFilter = createRequestFilter({
  tokenGenerator: () => {
    if (!cachedToken) {
      throw new Error('Token not initialized -- call setup first')
    }
    return cachedToken
  }
})

beforeAll(async () => {
  cachedToken = await fetchIdentityToken()
})

const options = buildVerifierOptions({
  provider: 'IdentityProtectedService',
  port: '4000',
  includeMainAndDeployed: true,
  requestFilter
})
```

## Related

- [noOpRequestFilter](./no-op-request-filter) -- pass-through variant for providers without auth
- [Request Filter Overview](./) -- when to use request filters, Express vs non-Express
