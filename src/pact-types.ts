/**
 * Local type definitions for @pact-foundation/pact internal types
 * that are not re-exported from the main package entry point.
 *
 * These mirror the types from:
 * - @pact-foundation/pact/src/common/jsonTypes
 * - @pact-foundation/pact/src/dsl/verifier/proxy/types
 */

export type AnyJson = boolean | number | string | null | JsonArray | JsonMap

export type JsonArray = Array<AnyJson>

export type JsonMap = { [key: string]: AnyJson }

export type StateFunc = (parameters?: AnyJson) => Promise<JsonMap | void>

export type StateFuncWithSetup = {
  setup?: StateFunc
  teardown?: StateFunc
}

export type StateHandler = StateFuncWithSetup | StateFunc

export type StateHandlers = {
  [name: string]: StateHandler
}

export type RequestFilter = (
  req: {
    headers: Record<string, string | string[] | undefined>
    body?: unknown
  },
  res: unknown,
  next: () => void | undefined
) => unknown

/**
 * Locally defined type matching the shape of ConsumerVersionSelector
 * from @pact-foundation/pact-core/src/verifier/types.
 * Defined here to avoid deep internal imports that could break with pact updates.
 */
export type ConsumerVersionSelector = {
  mainBranch?: boolean
  matchingBranch?: boolean
  deployedOrReleased?: boolean
  deployed?: boolean
  released?: boolean
  consumer?: string
  branch?: string
  tag?: string
  latest?: boolean
  fallbackTag?: string
  fallbackBranch?: string
}
