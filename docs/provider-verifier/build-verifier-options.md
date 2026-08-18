---
title: buildVerifierOptions
description: Build VerifierOptions for HTTP Pact provider verification with a single function call.
---

# buildVerifierOptions

```typescript
import { buildVerifierOptions } from '@seontechnologies/pactjs-utils'
```

Builds a `VerifierOptions` object for HTTP provider verification. This is the
primary entry point for most provider test files.

```typescript
// Full example: https://github.com/seontechnologies/pactjs-utils/blob/main/pact/http/provider/provider-contract.pacttest.ts
const options = buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  includeMainAndDeployed: true
})
```

## Parameters

| Name                        | Type / Default                             | What it does                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `provider`                  | `string` — **required**                    | Provider name; must match consumer pact definitions.                                                                                                                                                       |
| `port`                      | `string` — **required**                    | Local port. Builds `providerBaseUrl` as `http://localhost:{port}`.                                                                                                                                         |
| `includeMainAndDeployed`    | `boolean` — **required**                   | When `true`, selectors include `mainBranch` + `deployedOrReleased`. Set `false` during breaking changes.                                                                                                   |
| `logLevel`                  | `string` — `'info'`                        | Pact verification log verbosity (`'trace'` through `'error'`).                                                                                                                                             |
| `stateHandlers`             | `StateHandlers` — optional                 | Provider state setup/teardown functions keyed by state description string.                                                                                                                                 |
| `beforeEach`                | `() => Promise` — optional                 | Hook called before each interaction is verified.                                                                                                                                                           |
| `afterEach`                 | `() => Promise` — optional                 | Hook called after each interaction is verified.                                                                                                                                                            |
| `consumer`                  | `string` — optional                        | Scopes selectors to this consumer only. Omit to verify all consumers.                                                                                                                                      |
| `consumerBranch`            | `string` — `env.PACT_CONSUMER_BRANCH`      | When set, adds `{ branch: <name> }` to the consumer version selectors. Manual fallback only; see [Verifying a Specific Consumer Branch](#verifying-a-specific-consumer-branch). |
| `enablePending`             | `boolean` — `false`                        | When `true`, pending pacts do not fail the provider build. See [enablePending — bridge, not bypass](../concepts#enablepending) for when to use this and why a permanent workflow env setting is dangerous. |
| `requestFilter`             | `RequestFilter` — `noOpRequestFilter`      | Middleware applied to each verification request. See [Request Filter](../request-filter/).                                                                                                                 |
| `publishVerificationResult` | `boolean` — `true`                         | Publish results back to the Pact Broker.                                                                                                                                                                   |
| `pactBrokerToken`           | `string` — `env.PACT_BROKER_TOKEN`         | Authentication token for the Pact Broker.                                                                                                                                                                  |
| `providerVersion`           | `string` — `env.GITHUB_SHA \|\| 'unknown'` | Version string for this verification. Typically a commit SHA.                                                                                                                                              |
| `providerVersionBranch`     | `string` — `env.GITHUB_BRANCH \|\| 'main'` | Branch name for this verification.                                                                                                                                                                         |
| `providerVersionTags`       | `string[]` — `getProviderVersionTags()`    | Tags applied to the provider version. See [getProviderVersionTags](./get-provider-version-tags).                                                                                                           |
| `pactUrls`                  | `string[]` — optional                      | Local pact file paths. Bypasses broker when provided.                                                                                                                                                      |
| `pactBrokerUrl`             | `string` — `env.PACT_BROKER_BASE_URL`      | Broker base URL. Required unless `pactUrls` or matching `pactPayloadUrl` provided.                                                                                                                         |
| `pactPayloadUrl`            | `string` — `env.PACT_PAYLOAD_URL`          | Webhook URL. When it matches provider + consumer, overrides broker verification.                                                                                                                           |

Both builders log a `console.table()` summary of the resolved configuration
to help with CI debugging.

## Return Value

Returns a `VerifierOptions` object from `@pact-foundation/pact`, ready to pass
to the Pact `Verifier`.

---

## Consumer Version Selectors

Consumer version selectors determine which consumer pact versions the provider
must verify against. The library builds these automatically based on the
`includeMainAndDeployed` and `consumer` parameters. Understanding them is key
to using the verifier effectively.

### How Selectors Are Built

The internal `buildConsumerVersionSelectors` function constructs an array of
`ConsumerVersionSelector` objects following this logic:

**Always included:**

- `{ matchingBranch: true }` -- Verifies pacts from consumer branches whose
  name matches the current provider branch. This is the foundation of
  coordinated feature development: when both consumer and provider create a
  branch named `feature/new-endpoint`, the consumer pact from that branch is
  verified against the provider on that branch.

**Included when `consumerBranch` is set:**

- `{ branch: "<consumerBranch>" }` -- Verifies pacts from a specific named
  consumer branch. See [Verifying a specific consumer branch](#verifying-a-specific-consumer-branch).

**Included when `includeMainAndDeployed` is `true`:**

- `{ mainBranch: true }` -- Verifies pacts from the consumer's main/default
  branch (typically `main`). This ensures the provider remains compatible with
  the current stable consumer contract.

- `{ deployedOrReleased: true }` -- Verifies pacts from consumer versions that
  are currently deployed or released to any environment. This ensures the
  provider does not break consumers already running in production or
  pre-production.

### Scoping to a Specific Consumer

When the `consumer` parameter is provided, every selector object gets a
`consumer` field. This restricts verification to pacts from that single
consumer, which is useful when:

- A provider has many consumers and you want to verify one at a time
- Webhook-triggered verification targets a specific consumer

```typescript
// All consumers, full selectors
buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  includeMainAndDeployed: true
})
// Selectors: [{ matchingBranch: true }, { mainBranch: true }, { deployedOrReleased: true }]

// Single consumer, full selectors
buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  includeMainAndDeployed: true,
  consumer: 'SampleAppConsumer'
})
// Selectors: [
//   { consumer: 'SampleAppConsumer', matchingBranch: true },
//   { consumer: 'SampleAppConsumer', mainBranch: true },
//   { consumer: 'SampleAppConsumer', deployedOrReleased: true }
// ]

// Breaking change mode -- matching branch only
buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  includeMainAndDeployed: false
})
// Selectors: [{ matchingBranch: true }]
```

---

## Verifying a Specific Consumer Branch

**Problem:** consumer branch name and provider branch name don't match (e.g.
provider merges to a weekly `release/week-32` branch before merging to `main`).
`matchingBranch: true` finds nothing, so the consumer's `can-i-deploy` fails
until the provider merges to `main`.

**Fix: nothing to change in provider test code, only CI config.**

1. Update `.github/workflows/contract-test-webhook.yml` to the latest version
   from this repo. The checkout step now falls back to
   `${pactbroker.providerVersionBranch}` (passed as `GITHUB_BRANCH` in the
   webhook payload) instead of jumping straight to `main`.
2. Make sure the provider's CI already runs on the release branch (e.g.
   `release/week-32`) before the consumer opens its PR. This is what
   registers that branch in PactFlow as the provider's active version. Normal
   CI-on-push already does this; no extra step needed.
3. Consumer opens its PR as usual. Pact Broker's webhook fires with
   `branch: release/week-32`, the provider workflow checks out that branch,
   verifies the pact, and the consumer's `can-i-deploy` passes. Nothing to do
   on the consumer side.

**Alternative, if the webhook isn't wired up yet:** the repo ships a matching
composite action, `.github/actions/detect-consumer-branch`. It reads a
`Pact consumer branch: <name>` line from the PR description (same pattern as
the existing `detect-breaking-change` action for `PACT_BREAKING_CHANGE`) and
exports `PACT_CONSUMER_BRANCH`. `buildVerifierOptions` reads it automatically
and adds `{ branch: <name> }` to the selectors.

1. Copy `.github/actions/detect-consumer-branch/` and the `Pact Consumer Branch`
   section of `.github/PULL_REQUEST_TEMPLATE.md` into the provider repo.
2. Add a step calling it in the provider verification workflow, right next to
   `detect-breaking-change`. See `contract-test-provider.yml` for the exact
   placement.
3. Fill in the branch name on the provider's PR description when needed;
   blank it once the consumer's PR has merged.

Requires manual coordination every cycle; prefer the webhook fix above once
it's in place.

See [handlePactBrokerUrlAndSelectors](./handle-pact-broker-url-and-selectors)
for how both `PACT_PAYLOAD_URL` and `PACT_CONSUMER_BRANCH` are applied.

---

## Breaking Changes Flow

When a provider introduces a breaking change to its API, the standard
selectors (`mainBranch` + `deployedOrReleased`) will fail because those
consumer pacts still reflect the old contract. The library provides a
coordinated workflow to handle this safely.

### Step 1: Set `includeMainAndDeployed: false`

This narrows consumer version selectors to only `{ matchingBranch: true }`,
meaning only pacts from a consumer branch with the same name as the provider
branch are verified. The provider can now pass verification while the consumer
updates its contract on a matching branch.

### Step 2: Use `PACT_BREAKING_CHANGE` Environment Variable

When `PACT_BREAKING_CHANGE` is set to `'true'`:

- `getProviderVersionTags()` excludes the `'dev'` tag from the provider
  version tags in CI. This prevents the broken provider version from being
  tagged as a candidate for deployment while the consumer catches up.
- The branch tag (from `GITHUB_BRANCH`) is still included so the provider
  version remains traceable.

### Step 3: PR Checkbox Pattern for CI Automation

Rather than requiring developers to manually set environment variables, add a
`[x] Pact breaking change` checkbox to your PR template. A CI step can parse
the PR body for that checkbox and export `PACT_BREAKING_CHANGE=true`
automatically (e.g., via `actions/github-script`).

The provider test file then reads from the environment:

```typescript
// pact/http/provider/provider-contract.pacttest.ts
const includeMainAndDeployed = process.env.PACT_BREAKING_CHANGE !== 'true'

const options = buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  includeMainAndDeployed
})
```

### Step-by-Step Workflow

**Consumer side (adapting to the breaking change):**

1. Create a branch matching the provider's branch name (e.g., `feature/new-endpoint`).
2. Update consumer tests and expectations to reflect the new contract.
3. Run `test:pact:consumer` and `publish:pact` to publish the updated contract.
4. The `matchingBranch` selector on the provider side now picks up this pact.

**Provider side (introducing the breaking change):**

1. Create the feature branch (e.g., `feature/new-endpoint`).
2. Check the "Pact breaking change" checkbox in the PR description.
3. CI sets `PACT_BREAKING_CHANGE=true`, which causes:
   - `includeMainAndDeployed` to resolve to `false`
   - Selectors to narrow to `[{ matchingBranch: true }]`
   - `getProviderVersionTags()` to exclude `'dev'`
4. Provider verification passes against the matching consumer branch only.
5. Once the consumer merges and deploys, the provider can uncheck the box and merge normally.

## Related

- [buildMessageVerifierOptions](./build-message-verifier-options) -- message-based variant
- [getProviderVersionTags](./get-provider-version-tags) -- tag generation
- [handlePactBrokerUrlAndSelectors](./handle-pact-broker-url-and-selectors) -- URL/selector logic
- [Provider Verifier Overview](./) -- examples and environment variables
