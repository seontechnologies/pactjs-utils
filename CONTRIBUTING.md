# Contributing to pactjs-utils

Welcome to `@seontechnologies/pactjs-utils`. This library provides reusable utilities for Pact.js consumer-driven contract testing, reducing boilerplate and enforcing consistent patterns across provider verification, consumer test setup, and request filtering.

## Project Vision

Pact.js contract testing involves significant configuration boilerplate: wiring up broker URLs, consumer version selectors, request filters, state handlers, and environment-aware defaults. This library extracts those patterns into well-tested, composable utilities so that teams can focus on writing contract tests rather than configuring infrastructure.

## Getting Started

### Prerequisites

- Node.js 20+ (the `.nvmrc` file specifies version 24)
- npm
- `@pact-foundation/pact >= 16.2.0` (peer dependency)

### Initial Setup

```bash
git clone https://github.com/seontechnologies/pactjs-utils.git
cd pactjs-utils
nvm use
npm install
```

### Verify Your Setup

```bash
npm run validate
```

This runs typecheck, lint, tests, and formatting in parallel. If it passes, your environment is ready.

### Build the Library

```bash
npm run build
```

This cleans the `dist/` directory and produces three outputs: CommonJS (`dist/cjs/`), ES Modules (`dist/esm/`), and TypeScript declarations (`dist/types/`).

## Development Workflow

1. Run `nvm use` to ensure you are on the correct Node.js version.
2. Run `npm install` to install dependencies.
3. Make your changes following the architecture and design principles below.
4. Run `npm run validate` to verify everything passes (typecheck, lint, test, format).
5. Run `npm run build` to confirm the library builds cleanly.
6. Submit a pull request following the PR guidelines.

## Architecture and Design Principles

### Functional Core

The library favors pure functions with no side effects in core utilities. Functions like `toJsonMap` and `createProviderState` take input and return output without mutating external state.

```typescript
// src/consumer-helpers/to-json-map.ts
export const toJsonMap = (obj: Record<string, unknown>): JsonMap =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      // Pure transformation logic, no side effects
    })
  )
```

### Higher-Order Functions for Customizable Behavior

Where behavior needs to be configurable, the library uses higher-order functions that return configured implementations. The `createRequestFilter` function is the primary example: it accepts an optional `tokenGenerator` and returns a `RequestFilter` function.

```typescript
// src/request-filter/create-request-filter.ts
export const createRequestFilter =
  (options?: RequestFilterOptions): RequestFilter =>
  (req, _, next) => {
    const tokenGenerator = options?.tokenGenerator || defaultTokenGenerator
    // Adds Bearer authorization header if not present
  }
```

### Configuration Builder Pattern

Complex configuration objects (like Pact `VerifierOptions`) are constructed through builder functions that encapsulate defaults, environment variable resolution, and conditional logic. `buildVerifierOptions` and `buildMessageVerifierOptions` demonstrate this pattern.

```typescript
// Usage example
const options = buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  stateHandlers,
  includeMainAndDeployed: true
})
```

### Environment-Aware Defaults with Explicit Overrides

Functions accept explicit parameter values but fall back to environment variables when not provided. This allows local development with sensible defaults while supporting CI/CD injection of secrets and metadata.

```typescript
// Parameters default to env vars but accept explicit overrides
buildVerifierOptions({
  provider: 'SampleMoviesAPI',
  port: '3001',
  includeMainAndDeployed: true
  // These all have env var fallbacks:
  // pactBrokerToken defaults to process.env.PACT_BROKER_TOKEN
  // providerVersion defaults to process.env.GITHUB_SHA || 'unknown'
  // providerVersionBranch defaults to process.env.GITHUB_BRANCH || 'main'
  // pactBrokerUrl defaults to process.env.PACT_BROKER_BASE_URL
})
```

## Module Structure

The library source code lives in `src/` and is organized into focused modules:

```text
src/
  index.ts                     # Barrel export for all public APIs
  pact-types.ts                # Shared type definitions (JsonMap, StateHandlers, RequestFilter, etc.)
  consumer-helpers/
    index.ts                   # Module barrel export
    create-provider-state.ts   # Creates provider state tuples for consumer tests
    create-provider-state.test.ts
    to-json-map.ts             # Converts arbitrary objects to Pact-compatible JsonMap
    to-json-map.test.ts
  request-filter/
    index.ts                   # Module barrel export
    create-request-filter.ts   # Higher-order function for authorization request filters
    create-request-filter.test.ts
  provider-verifier/
    index.ts                   # Module barrel export
    build-verifier-options.ts  # Builds VerifierOptions and PactMessageProviderOptions
    build-verifier-options.test.ts
    handle-url-and-selectors.ts  # Pact broker URL and consumer version selector logic
    handle-url-and-selectors.test.ts
```

### Module Descriptions

- **consumer-helpers**: Utilities for consumer-side Pact tests. `createProviderState` produces tuples for `provider.given(...)` calls. `toJsonMap` converts arbitrary objects into Pact-compatible JSON maps.
- **request-filter**: Provides `createRequestFilter` (a higher-order function that returns an Express-compatible request filter for adding authorization headers) and `noOpRequestFilter` (a pass-through filter).
- **provider-verifier**: Builds complete `VerifierOptions` and `PactMessageProviderOptions` objects for provider verification. Handles Pact Broker URL resolution, consumer version selectors, payload URL matching, and provider version tagging.
- **pact-types**: Local type definitions mirroring internal `@pact-foundation/pact` types that are not re-exported from the main package entry point. This avoids deep internal imports that could break across Pact updates.

## Adding New Utilities

### Module Structure

Create a new directory under `src/` with the following structure:

```text
src/new-utility/
  index.ts              # Module barrel export
  new-utility.ts        # Implementation
  new-utility.test.ts   # Co-located tests
```

### Implementation Checklist

1. **Create the implementation file** with pure, well-typed functions.
2. **Create an `index.ts`** barrel export that re-exports public functions and types.
3. **Write co-located tests** in a `*.test.ts` file alongside the implementation.
4. **Add exports** to `src/index.ts` so consumers can import from the library root.
5. **Add types** to `src/pact-types.ts` if the new utility introduces shared Pact-related types.
6. **Run `npm run validate`** to confirm everything passes.

### Example: Adding a New Utility

```typescript
// src/new-utility/my-helper.ts
import type { JsonMap } from '../pact-types'

export const myHelper = (input: string): JsonMap => {
  // Implementation
}
```

```typescript
// src/new-utility/index.ts
export { myHelper } from './my-helper'
```

```typescript
// src/new-utility/my-helper.test.ts
import { describe, it, expect } from 'vitest'
import { myHelper } from './my-helper'

describe('myHelper', () => {
  it('should transform input correctly', () => {
    const result = myHelper('test')
    expect(result).toEqual({
      /* expected */
    })
  })
})
```

Then add to `src/index.ts`:

```typescript
export { myHelper } from './new-utility'
```

## Code Standards

### TypeScript

- Strict mode is enabled (`strict: true`, `strictNullChecks: true`, `strictFunctionTypes: true`, `noUncheckedIndexedAccess: true`).
- Prefer `type` over `interface` for type definitions.
- Use explicit return types for exported functions.
- Avoid `any`; use `unknown` and proper generics instead.
- Avoid enums; use `as const` objects or union types.

### File Organization

- Source files use kebab-case (e.g., `create-request-filter.ts`, `build-verifier-options.ts`).
- Each module has an `index.ts` barrel export.
- Tests are co-located with their source files using the `*.test.ts` naming pattern.
- Keep files under 250 lines. Break large files into smaller, focused functions.

### Functional Style

- Prefer pure functions without side effects.
- Avoid mutations and global state.
- Use higher-order functions for configurable behavior.
- Keep functions small and focused.

## Testing Requirements

### Test Framework

The library uses **Vitest** for all tests. The configuration is in `vitest.config.mts`:

```typescript
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
```

### Test Standards

- **Co-located tests**: Test files live alongside their source files with a `*.test.ts` suffix.
- **Mock isolation**: Use `vi.fn()` and `vi.mock()` for test doubles. Do not rely on external services or shared mutable state.
- **Explicit assertions**: Keep assertions in test bodies, not abstracted into helpers.
- **Deterministic**: Tests must not depend on execution order, external timing, or shared global state.
- **Self-contained**: Each test sets up its own data and does not depend on other tests.

### Test Patterns in This Codebase

Tests follow a consistent pattern. Here is an example from the request filter tests:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createRequestFilter, noOpRequestFilter } from './create-request-filter'

const makeReq = (headers: Record<string, string> = {}) =>
  ({ headers: { ...headers }, body: undefined }) as never

describe('createRequestFilter', () => {
  it('adds a Bearer authorization header when absent', () => {
    const filter = createRequestFilter()!
    const req = makeReq()
    const result = filter(req, {} as never, undefined as never)
    expect(result).toBeDefined()
    expect(
      (req as { headers: Record<string, string> }).headers['authorization']
    ).toMatch(/^Bearer .+/)
  })

  it('uses a custom tokenGenerator', () => {
    const filter = createRequestFilter({
      tokenGenerator: () => 'my-custom-token'
    })!
    const req = makeReq()
    filter(req, {} as never, undefined as never)
    expect(
      (req as { headers: Record<string, string> }).headers['authorization']
    ).toBe('Bearer my-custom-token')
  })
})
```

### Running Tests

```bash
# Run library unit tests
npm run test:lib

# Run all tests (library + sample app backend + sample app frontend)
npm run test

# Run sample app Pact consumer tests
npm run test:pact:consumer

# Run sample app Pact provider tests (local CDCT + MQ)
npm run test:pact:provider:local
npm run test:pact:provider:local:contract # optional - CDCT only
npm run test:pact:provider:local:message  # optional - message only

# Run both consumer and provider Pact tests locally
npm run test:pact:local
```

## Environment Configuration

The `.env.example` file documents the available environment variables:

| Variable               | Purpose                                           | Required                |
| ---------------------- | ------------------------------------------------- | ----------------------- |
| `PACT_BROKER_BASE_URL` | Pact Broker / PactFlow base URL                   | For remote verification |
| `PACT_BROKER_TOKEN`    | Authentication token for the Pact Broker          | For remote verification |
| `GITHUB_SHA`           | Git commit SHA (set automatically in CI)          | For provider versioning |
| `GITHUB_BRANCH`        | Git branch name (set automatically in CI)         | For provider versioning |
| `PACT_BREAKING_CHANGE` | Set to `true` during coordinated breaking changes | Optional                |
| `PACT_PAYLOAD_URL`     | Webhook payload URL (set by PactFlow webhooks)    | Automatic               |

For local development, the library provides sensible fallbacks (e.g., `providerVersion` defaults to `'unknown'`, `providerVersionBranch` defaults to `'main'`, and version tags default to `['local']`).

## Submitting Changes

### Pull Request Guidelines

1. **Keep PRs focused**: One feature or fix per PR.
2. **Size limit**: Aim for fewer than 500 lines changed. If larger, explain why.
3. **Tests required**: All new code must have co-located `*.test.ts` tests.
4. **CI must pass**: All checks in `npm run validate` must be green.
5. **No breaking changes** without documentation and a major version bump plan.

### PR Checklist

```markdown
- [ ] New code follows functional style (pure functions, no unnecessary side effects)
- [ ] Co-located tests added with \*.test.ts naming
- [ ] All tests pass (`npm run test:lib`)
- [ ] Typecheck passes (`npm run typecheck`)
- [ ] Lint passes (`npm run lint`)
- [ ] `npm run validate` passes
- [ ] Build succeeds (`npm run build`)
- [ ] Exports added to src/index.ts if introducing new public APIs
- [ ] Types added to src/pact-types.ts if introducing new shared Pact types
- [ ] No breaking change, or breaking change is documented
- [ ] No secrets or credentials committed
```

### Commit Message Format

```text
type: brief description

Detailed explanation if needed.
Related to #123
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:

```text
feat: add message provider verification builder

Adds buildMessageVerifierOptions for message-based Pact verification.
Supports the same broker URL and selector logic as HTTP verification.

fix: handle missing authorization header case-insensitively

The request filter now checks for both 'Authorization' and 'authorization'
headers before adding a new one.
```

## Available npm Scripts

| Script                                       | Description                                                 |
| -------------------------------------------- | ----------------------------------------------------------- |
| `npm run validate`                           | Run typecheck, lint, test, and format in parallel           |
| `npm run build`                              | Clean and build CJS, ESM, and type declarations             |
| `npm run clean`                              | Remove the `dist/` directory                                |
| `npm run test:lib`                           | Run library unit tests with Vitest                          |
| `npm run test`                               | Run all tests (library + sample app)                        |
| `npm run test:pact:consumer`                 | Run sample app Pact consumer tests                          |
| `npm run test:pact:provider:local`           | Run sample app Pact provider tests locally (CDCT + MQ)      |
| `npm run test:pact:provider:local:contract`  | Run local provider CDCT verification only                   |
| `npm run test:pact:provider:local:message`   | Run local provider message verification only                |
| `npm run test:pact:local`                    | Run consumer then provider Pact tests locally               |
| `npm run test:pact:provider:remote`          | Run provider verification against remote broker (CDCT + MQ) |
| `npm run test:pact:provider:remote:contract` | Run remote provider CDCT verification only                  |
| `npm run test:pact:provider:remote:message`  | Run remote provider message verification only               |
| `npm run typecheck`                          | TypeScript type checking without emit                       |
| `npm run lint`                               | ESLint with auto-fix                                        |
| `npm run fix:format`                         | Prettier formatting                                         |
| `npm run start:sample-app`                   | Start sample app backend and frontend                       |
| `npm run publish:local`                      | Publish the package locally via script                      |
| `npm run publish:pact`                       | Publish Pact contracts to the broker                        |
| `npm run can:i:deploy:consumer`              | Check if consumer can be deployed                           |
| `npm run can:i:deploy:provider`              | Check if provider can be deployed                           |
| `npm run record:consumer:deployment`         | Record consumer deployment in broker                        |
| `npm run record:provider:deployment`         | Record provider deployment in broker                        |
| `npm run docs:dev`                           | Start VitePress docs dev server                             |
| `npm run docs:build`                         | Build VitePress documentation                               |
| `npm run docs:preview`                       | Preview built documentation                                 |

## Release Process

### Publishing via GitHub UI

1. Go to Actions and select the "Publish Package" workflow.
2. Click "Run workflow" and select the version type (patch, minor, major, or custom).
3. Review and merge the generated PR.

### Local Publishing

```bash
npm run publish:local
```

The package publishes to the public npm registry under the `@seontechnologies` scope.

## Getting Help

- **Issues**: Report bugs and feature requests via [GitHub Issues](https://github.com/seontechnologies/pactjs-utils/issues).
- **Repository**: [github.com/seontechnologies/pactjs-utils](https://github.com/seontechnologies/pactjs-utils)

---

Thank you for contributing to pactjs-utils.
