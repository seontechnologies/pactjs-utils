---
title: Installation
description: Install, configure, and orient yourself in pactjs-utils.
---

# Installation

## Prerequisites

- **Node.js** 18 or later (Pact 16.x requires it)
- **@pact-foundation/pact** 16.2.0 or later (peer dependency)

## Install

```bash
npm install -D @seontechnologies/pactjs-utils @pact-foundation/pact
```

## Environment Variables

Copy `.env.example` to `.env` at the repo root and fill in your values.
Only `PACT_BROKER_BASE_URL` and `PACT_BROKER_TOKEN` are needed for remote
flows. Everything else has sensible defaults or is set automatically by
GitHub Actions.

| Variable               | Required     | Purpose                                             |
| ---------------------- | ------------ | --------------------------------------------------- |
| `PACT_BROKER_BASE_URL` | Remote flow  | Your Pact Broker or PactFlow URL                    |
| `PACT_BROKER_TOKEN`    | Remote flow  | Authentication token for the broker                 |
| `GITHUB_SHA`           | No (CI auto) | Commit SHA used as provider version                 |
| `GITHUB_BRANCH`        | No (CI auto) | Branch name for version tagging and selectors       |
| `PACT_BREAKING_CHANGE` | No           | Set to `'true'` during coordinated breaking changes |
| `PACT_PAYLOAD_URL`     | No (webhook) | Set automatically by PactFlow webhooks              |

For details on how each variable affects verification, see the
[Environment Variables](/provider-verifier/#environment-variables) section in
Provider Verifier.

## Project Structure

The sample application demonstrates the recommended layout for organizing
Pact tests alongside the library:

```text
pact/
├── http/
│   ├── consumer/                        # HTTP consumer tests
│   │   ├── movies-read.pacttest.ts
│   │   └── movies-write.pacttest.ts
│   ├── provider/                        # HTTP provider verification
│   │   └── provider-contract.pacttest.ts
│   └── helpers/                         # Shared test helpers
│       ├── state-handlers.ts            #   Provider state handlers (app-specific)
│       ├── provider-states.ts           #   Provider state factories (app-specific)
│       └── pact-helpers.ts              #   Auth token generation (app-specific)
├── message/
│   ├── consumer/                        # Message consumer tests
│   │   └── movie-events.pacttest.ts
│   ├── provider/                        # Message provider verification
│   │   └── provider-message-queue.pacttest.ts
│   └── helpers/
│       ├── message-providers.ts         #   Message payload producers (app-specific)
│       └── state-handlers.ts            #   Message state handlers (app-specific)
pacts/                                   # Generated contract JSON files (gitignored)
scripts/
├── env-setup.sh                         # Loads .env for local broker commands
├── publish-pact.sh                      # Publish consumer pacts to the broker
├── publish-provider-contract.sh         # Publish OpenAPI spec to PactFlow (BDCT)
├── can-i-deploy.sh                      # Pre-deployment safety check
├── record-deployment.sh                 # Record a deployment in the broker
└── templates/                           # Standalone versions for copying into other repos
```

The library (`src/`) provides the reusable utilities. The `pact/` directory
is where your project-specific tests live. The `helpers/` directories
contain application-specific code — state handlers, token generators, and
factories — that the library intentionally does not abstract.

Tests use [Vitest](https://vitest.dev/) as the test runner — see the
`vitest.consumer.config.mts` and `vitest.provider.config.mts` files in each
`pact/http/` and `pact/message/` directory.

## Common Commands

```bash
# Run the full local contract flow (consumer + provider)
npm run test:pact:local

# Consumer tests only (HTTP + message)
npm run test:pact:consumer

# Provider verification only (local pact file, no broker)
npm run test:pact:provider:local

# Provider verification against the broker (requires env vars)
npm run test:pact:provider:remote

# Publish consumer pacts to the broker
npm run publish:pact

# Check deployment safety
npm run can:i:deploy:consumer
npm run can:i:deploy:provider

# Library unit tests
npm run test:lib

# Build CJS + ESM + types
npm run build

# Local docs preview
npm run docs:dev
```

## First-time Bootstrap

When adding contract tests to a repo for the first time, `can-i-deploy` will
fail because no verified contract exists on the broker yet. To handle this
chicken-and-egg problem:

1. Gate `can-i-deploy` and `record-deployment` to `main`/`master` only in your
   first PR (use `if: github.ref == 'refs/heads/main'`).
2. Merge the PR — this publishes and verifies the first contract on `main`.
3. In a follow-up PR, remove the `main`-only condition so `can-i-deploy` runs
   on every PR and blocks merges when contracts are incompatible.

## Next Steps

1. **[Concepts](/concepts)** — Understand the testing model and how the
   library fits in.
2. **[Consumer Helpers](/consumer-helpers/)** — Write your first consumer
   test with `createProviderState` and `toJsonMap`.
3. **[Request Filter](/request-filter/)** — Set up auth token injection for
   provider verification.
4. **[Provider Verifier](/provider-verifier/)** — Build verifier options
   with one call and configure CI integration.
