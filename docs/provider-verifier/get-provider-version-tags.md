---
title: getProviderVersionTags
description: Generate CI-aware provider version tags for Pact Broker.
---

# getProviderVersionTags

```typescript
import { getProviderVersionTags } from '@seontechnologies/pactjs-utils'
```

Generates an array of tags to associate with the provider version during
verification. Tags are used by the Pact Broker for version tracking and
webhook routing.

```typescript
const tags = getProviderVersionTags()
```

## Behavior

| Environment    | `PACT_BREAKING_CHANGE` | `GITHUB_BRANCH` | Result                   |
| -------------- | ---------------------- | --------------- | ------------------------ |
| Local (not CI) | any                    | any             | `['local']`              |
| CI             | unset or `'false'`     | unset           | `['dev']`                |
| CI             | unset or `'false'`     | `'feature/foo'` | `['dev', 'feature/foo']` |
| CI             | `'true'`               | unset           | `[]`                     |
| CI             | `'true'`               | `'feature/foo'` | `['feature/foo']`        |

**Key detail**: When `PACT_BREAKING_CHANGE` is `'true'`, the `'dev'` tag is
excluded. This prevents the Pact Broker from treating the breaking provider
version as a deployable candidate while the consumer is still catching up.

CI detection uses the `is-ci` package.

## Related

- [buildVerifierOptions](./build-verifier-options) -- uses this as the default for `providerVersionTags`
- [Provider Verifier Overview](./) -- breaking change workflow context
