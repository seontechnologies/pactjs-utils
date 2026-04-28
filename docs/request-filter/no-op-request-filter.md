---
title: noOpRequestFilter
description: A pass-through request filter for providers that do not require auth injection.
---

# noOpRequestFilter

```typescript
import { noOpRequestFilter } from '@seontechnologies/pactjs-utils'
```

Pass-through filter that makes no modifications to the request. Handles Express / non-Express bridging automatically (see [Express vs Non-Express Environments](../request-filter/#express-vs-non-express-environments)).

```typescript
const noOpRequestFilter: RequestFilter
```

## When to Use

Use `noOpRequestFilter` when:

- The provider under test does not require auth.
- Auth is handled by a separate mechanism (e.g. provider state).
- You want an explicit "no filter" value rather than `undefined`.

`buildVerifierOptions` defaults its `requestFilter` parameter to `noOpRequestFilter`, so omitting the option is equivalent to passing it explicitly.

## Example

```typescript
import {
  noOpRequestFilter,
  buildVerifierOptions
} from '@seontechnologies/pactjs-utils'

const options = buildVerifierOptions({
  provider: 'PublicService',
  port: '4001',
  includeMainAndDeployed: true,
  requestFilter: noOpRequestFilter // explicit no-op
})
```

## Related

- [createRequestFilter](./create-request-filter) -- active variant that injects auth headers
- [Request Filter Overview](./) -- when to use request filters
