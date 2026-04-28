# Repository Guidelines

## Project Overview

`@seontechnologies/pactjs-utils` is a reusable TypeScript utility library for Pact.js consumer-driven contract testing. It provides helpers for consumer test setup, provider verification configuration, and request filtering -- reducing boilerplate across services that adopt Pact.

## Project Structure

```
src/
  index.ts                  # barrel export for all public API
  pact-types.ts             # shared Pact type definitions (StateHandlers, RequestFilter, JsonMap, etc.)
  consumer-helpers/         # createProviderState, toJsonMap
  request-filter/           # createRequestFilter, noOpRequestFilter
  provider-verifier/        # buildVerifierOptions, handlePactBrokerUrlAndSelectors
pact/                       # sample Pact tests organized by protocol (http/, message/)
sample-app/                 # full-stack demo app (backend + frontend + shared types)
docs/                       # VitePress documentation site
scripts/                    # CI/CD helpers (publish, can-i-deploy, record-deployment)
dist/                       # build output (cjs, esm, types) -- do not edit
```

## Build and Development Commands

```bash
npm run build              # clean + emit CJS, ESM, and type declarations into dist/
npm run clean              # remove dist/
npm run typecheck          # run tsc --noEmit against tsconfig.json
npm run lint               # ESLint with auto-fix
npm run fix:format         # Prettier format all JS/TS/JSON files
npm run validate           # parallel typecheck + lint + test + format

npm run test               # run all tests (lib + sample-app backend + frontend)
npm run test:lib           # vitest run -- library unit tests only
npm run test:backend       # sample-app backend tests
npm run test:frontend      # sample-app frontend tests

npm run test:pact:consumer # all consumer pact tests (HTTP + message)
npm run test:pact:consumer:http # consumer HTTP pact tests
npm run test:pact:consumer:message # consumer message pact tests
npm run test:pact:provider:local # provider pact tests locally (CDCT + MQ)
npm run test:pact:provider:local:contract # provider CDCT only (local)
npm run test:pact:provider:local:message # provider message only (local)
npm run test:pact:local    # consumer then provider sequentially

npm run start:sample-app   # start backend + frontend in parallel
npm run publish:local      # local dry-run publish via scripts/publish.sh

npm run docs:dev           # VitePress dev server
npm run docs:build         # build static docs site
npm run docs:preview       # preview built docs locally
```

Remote Pact Broker commands (`publish:pact`, `test:pact:provider:remote`, `test:pact:provider:remote:contract`, `test:pact:provider:remote:message`, `can:i:deploy:*`, `record:*:deployment`) require environment variables from `.env` -- see the Environment Variables section.

## Coding Style and Naming Conventions

- TypeScript with strict mode enabled (`strict`, `strictNullChecks`, `noUncheckedIndexedAccess`).
- Prefer `type` over `interface`. Avoid enums; use `as const` objects instead.
- Functional style with pure functions. Avoid mutations and class-based patterns.
- File names use kebab-case (`create-request-filter.ts`). Directories use kebab-case.
- Each feature folder has its own `index.ts` barrel; the top-level `src/index.ts` re-exports everything public.
- Keep files under 250 lines. Extract helpers into focused functions.
- Run `npm run fix:format` before pushing.

## Testing Guidelines

- **Test runner**: Vitest (with `vitest/globals` types enabled).
- **Co-located tests**: place `*.test.ts` files next to the source they verify (e.g., `create-request-filter.test.ts` beside `create-request-filter.ts`).
- **What to test**: when adding a new utility, write unit tests covering the happy path, edge cases, and error handling. If the utility interacts with Pact internals, mock them.
- **Assertions**: keep assertions explicit in test files; do not abstract them into helpers.
- **Test independence**: every test must run in isolation with no shared mutable state.
- **Naming**: use `describe('functionName', ...)` and `it('should ... when ...', ...)`.
- **Pact contract tests**: organized by protocol -- HTTP tests in `pact/http/` and message queue tests in `pact/message/`, each with consumer/provider subdirectories and dedicated vitest configs.
- Run `npm run validate` before every PR to catch regressions across typecheck, lint, tests, and formatting.

## Commit and PR Guidelines

- Use Conventional Commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Keep subjects under 72 characters and focused on a single change.
- PRs should be under 500 lines changed when possible.
- PR checklist:
  - [ ] Has relevant tests
  - [ ] Does not introduce flakiness
  - [ ] No breaking change, or breaking change documented
  - [ ] Docs updated if needed
- Rerun `npm run validate` after rebases.

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable                       | Purpose                                           |
| ------------------------------ | ------------------------------------------------- |
| `PACT_BROKER_BASE_URL`         | PactFlow broker URL (required for remote flows)   |
| `PACT_BROKER_TOKEN`            | PactFlow API token                                |
| `PACT_BREAKING_CHANGE`         | Set to `true` during coordinated breaking changes |
| `GITHUB_SHA` / `GITHUB_BRANCH` | CI metadata (set automatically by GitHub Actions) |

Never commit `.env` values. Use `.env.example` as a template and keep secrets in environment variables or a secret manager.
