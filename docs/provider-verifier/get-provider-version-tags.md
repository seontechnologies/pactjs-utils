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

| Environment    | `PACT_BREAKING_CHANGE` | `GITHUB_BRANCH` | Result              |
| -------------- | ---------------------- | --------------- | ------------------- |
| Local (not CI) | any                    | any             | `['local']`         |
| CI             | unset or `'false'`     | unset           | `[]`                |
| CI             | unset or `'false'`     | `'master'`      | `['dev', 'master']` |
| CI             | unset or `'false'`     | `'main'`        | `['dev', 'main']`   |
| CI             | unset or `'false'`     | `'feature/foo'` | `['feature/foo']`   |
| CI             | `'true'`               | `'master'`      | `['master']`        |
| CI             | `'true'`               | `'feature/foo'` | `['feature/foo']`   |

**Key detail (`'dev'` tag)**: PactFlow promotes the legacy `'dev'` tag into
the `dev` environment. Tagging a feature/PR build with `'dev'` therefore makes
it masquerade as the version "currently deployed to dev" — every consumer's
`can-i-deploy --to-environment dev` then reflects whichever PR happened to
verify last, instead of what is actually deployed. To prevent that, the
`'dev'` tag is only added when `GITHUB_BRANCH` is `'master'` or `'main'`.
Recording an actual deployment is the job of `record-deployment` (run only
on master), not of the verifier.

**Key detail (`PACT_BREAKING_CHANGE`)**: When set to `'true'`, the `'dev'`
tag is excluded even on master. This prevents the Pact Broker from treating
the breaking provider version as a deployable candidate while the consumer
is still catching up.

CI detection uses the `is-ci` package.

## Related

- [buildVerifierOptions](./build-verifier-options) -- uses this as the default for `providerVersionTags`
- [Provider Verifier Overview](./) -- breaking change workflow context
