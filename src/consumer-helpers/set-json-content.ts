import type { Matcher } from '@pact-foundation/pact'

/**
 * Local aliases for Pact template structures.
 * We intentionally avoid deep imports from @pact-foundation/pact internals.
 * Shapes mirror the public Pact v3 template contracts for v4 HTTP builders.
 */
type PactTemplateHeaders = Record<
  string,
  string | Matcher<string> | Array<string | Matcher<string>>
>

type PactTemplateQuery = Record<
  string,
  | string
  | Matcher<string | number | boolean>
  | Array<string | Matcher<string | number | boolean>>
>

type JsonContentBuilder = {
  headers: (headers: PactTemplateHeaders) => unknown
  jsonBody: (body: unknown) => unknown
  query?: (query: PactTemplateQuery) => unknown
}

export type JsonContentInput = {
  body?: unknown
  headers?: PactTemplateHeaders
  query?: PactTemplateQuery
}

/**
 * Curried Pact builder helper for request/response JSON interactions.
 *
 * Supports query + headers + JSON body in one reusable function.
 * - Request builders apply `query`, `headers`, and `body`
 * - Response builders apply `headers` and `body` (ignore `query`)
 */
export const setJsonContent =
  ({ body, headers, query }: JsonContentInput) =>
  (builder: JsonContentBuilder): void => {
    if (query && builder.query) {
      builder.query(query)
    }

    if (headers) {
      builder.headers(headers)
    }

    if (body !== undefined) {
      builder.jsonBody(body)
    }
  }

/**
 * Backward-compatible convenience alias for body-only usage.
 */
export const setJsonBody = (body: unknown) => setJsonContent({ body })
